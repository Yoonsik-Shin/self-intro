package com.selfintro.modules.donation.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.donation.config.DonationProperties;
import com.selfintro.modules.donation.domain.Donation;
import com.selfintro.modules.donation.domain.DonationEvent;
import com.selfintro.modules.donation.domain.DonationEventActor;
import com.selfintro.modules.donation.domain.DonationEventRepository;
import com.selfintro.modules.donation.domain.DonationEventType;
import com.selfintro.modules.donation.domain.DonationRepository;
import com.selfintro.modules.donation.domain.DonationSetting;
import com.selfintro.modules.donation.domain.DonationSettingRepository;
import com.selfintro.modules.donation.presentation.dto.KofiWebhookPayload;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DonationServiceTest {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 17, 12, 0);

    @Mock private DonationRepository donationRepository;

    @Mock private DonationEventRepository donationEventRepository;

    @Mock private DonationSettingRepository donationSettingRepository;

    private DonationService donationService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-07-17T03:00:00Z"), SEOUL);
        DonationProperties properties =
                new DonationProperties(
                        new DonationProperties.Kofi("https://ko-fi.com/test", "test-token"));
        donationService =
                new DonationService(
                        donationRepository,
                        donationEventRepository,
                        donationSettingRepository,
                        properties,
                        clock);
    }

    @Test
    void donationTransitionsAreIdempotent() {
        Donation donation = Donation.request(5000, null, NOW);
        donation.assignMulNo("mul-123");

        assertThat(donation.markPaid(NOW, "4")).isTrue();
        assertThat(donation.markPaid(NOW.plusMinutes(1), "4")).isFalse();
        assertThat(donation.getPaidAt()).isEqualTo(NOW);

        assertThat(donation.markCanceled(NOW.plusMinutes(2), "8")).isTrue();
        assertThat(donation.markCanceled(NOW.plusMinutes(3), "8")).isFalse();
        assertThat(donation.getCanceledAt()).isEqualTo(NOW.plusMinutes(2));
    }

    @Test
    void assignMulNoKeepsFirstValue() {
        Donation donation = Donation.request(5000, null, NOW);
        donation.assignMulNo("first");
        donation.assignMulNo("second");
        assertThat(donation.getMulNo()).isEqualTo("first");
    }

    @Test
    void donationEnabledDefaultsToTrueWithoutSettingRow() {
        when(donationSettingRepository.findById(DonationSetting.SINGLETON_ID))
                .thenReturn(Optional.empty());

        assertThat(donationService.isDonationEnabled()).isTrue();
    }

    @Test
    void updateDonationEnabledCreatesRowWhenMissing() {
        when(donationSettingRepository.findById(DonationSetting.SINGLETON_ID))
                .thenReturn(Optional.empty());
        when(donationSettingRepository.save(any(DonationSetting.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(donationService.updateDonationEnabled(false)).isFalse();
    }

    @Test
    void adminEventsThrowsWhenDonationUnknown() {
        when(donationRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> donationService.adminEvents(99L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getKofiPageUrlReturnsConfiguredValue() {
        assertThat(donationService.getKofiPageUrl()).isEqualTo("https://ko-fi.com/test");
    }

    @Test
    void handleKofiWebhookAcceptsValidTokenAndRecordsPaidDonation() {
        when(donationRepository.findWithLockByMulNo("tx-1")).thenReturn(Optional.empty());
        org.mockito.ArgumentCaptor<Donation> captor =
                org.mockito.ArgumentCaptor.forClass(Donation.class);
        when(donationRepository.save(captor.capture()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        boolean accepted =
                donationService.handleKofiWebhook(kofiPayload("tx-1", "5.00", "test-token"));

        assertThat(accepted).isTrue();
        assertThat(captor.getValue().getCurrency()).isEqualTo("USD");
        assertThat(captor.getValue().isSubscription()).isFalse();
        assertThat(captor.getValue().getProviderPaidAt())
                .isEqualTo(LocalDateTime.of(2026, 7, 17, 21, 0));
        java.util.List<DonationEvent> events = capturedEvents();
        assertThat(events).hasSize(1);
        assertThat(events.get(0).getEventType()).isEqualTo(DonationEventType.PAID);
        assertThat(events.get(0).getActor()).isEqualTo(DonationEventActor.KOFI);
    }

    @Test
    void handleKofiWebhookRecordsSubscriptionFlagAndCurrencyFromPayload() {
        when(donationRepository.findWithLockByMulNo("tx-sub")).thenReturn(Optional.empty());
        org.mockito.ArgumentCaptor<Donation> captor =
                org.mockito.ArgumentCaptor.forClass(Donation.class);
        when(donationRepository.save(captor.capture()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        donationService.handleKofiWebhook(kofiPayload("tx-sub", "3.00", "EUR", true, "test-token"));

        assertThat(captor.getValue().getCurrency()).isEqualTo("EUR");
        assertThat(captor.getValue().isSubscription()).isTrue();
    }

    @Test
    void handleKofiWebhookToleratesUnparsableTimestamp() {
        when(donationRepository.findWithLockByMulNo("tx-badts")).thenReturn(Optional.empty());
        org.mockito.ArgumentCaptor<Donation> captor =
                org.mockito.ArgumentCaptor.forClass(Donation.class);
        when(donationRepository.save(captor.capture()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        KofiWebhookPayload payload =
                new KofiWebhookPayload(
                        "msg-tx-badts",
                        "not-a-timestamp",
                        "Donation",
                        "테스터",
                        "응원합니다",
                        "5.00",
                        "USD",
                        "https://ko-fi.com",
                        "tx-badts",
                        false,
                        "test-token");

        boolean accepted = donationService.handleKofiWebhook(payload);

        assertThat(accepted).isTrue();
        assertThat(captor.getValue().getProviderPaidAt()).isNull();
    }

    @Test
    void handleKofiWebhookRejectsInvalidToken() {
        boolean accepted =
                donationService.handleKofiWebhook(kofiPayload("tx-2", "5.00", "wrong-token"));

        assertThat(accepted).isFalse();
        verify(donationRepository, never())
                .findWithLockByMulNo(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void handleKofiWebhookIsIdempotentOnDuplicateTransactionId() {
        Donation existing = Donation.request(5000, "already paid", NOW);
        when(donationRepository.findWithLockByMulNo("tx-3")).thenReturn(Optional.of(existing));

        boolean accepted =
                donationService.handleKofiWebhook(kofiPayload("tx-3", "5.00", "test-token"));

        assertThat(accepted).isTrue();
        verify(donationRepository, never()).save(any());
    }

    @Test
    void handleKofiWebhookParsesDecimalAmountRoundingToNearestInt() {
        when(donationRepository.findWithLockByMulNo("tx-4")).thenReturn(Optional.empty());
        org.mockito.ArgumentCaptor<Donation> captor =
                org.mockito.ArgumentCaptor.forClass(Donation.class);
        when(donationRepository.save(captor.capture()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        donationService.handleKofiWebhook(kofiPayload("tx-4", "10.60", "test-token"));

        assertThat(captor.getValue().getAmount()).isEqualTo(11);
    }

    private KofiWebhookPayload kofiPayload(String transactionId, String amount, String token) {
        return kofiPayload(transactionId, amount, "USD", false, token);
    }

    private KofiWebhookPayload kofiPayload(
            String transactionId,
            String amount,
            String currency,
            boolean subscription,
            String token) {
        return new KofiWebhookPayload(
                "msg-" + transactionId,
                "2026-07-17T12:00:00Z",
                "Donation",
                "테스터",
                "응원합니다",
                amount,
                currency,
                "https://ko-fi.com",
                transactionId,
                subscription,
                token);
    }

    private java.util.List<DonationEvent> capturedEvents() {
        org.mockito.ArgumentCaptor<DonationEvent> captor =
                org.mockito.ArgumentCaptor.forClass(DonationEvent.class);
        verify(donationEventRepository, org.mockito.Mockito.atLeast(0)).save(captor.capture());
        return captor.getAllValues();
    }
}
