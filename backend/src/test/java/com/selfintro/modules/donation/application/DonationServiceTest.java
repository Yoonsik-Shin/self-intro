package com.selfintro.modules.donation.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.donation.config.DonationProperties;
import com.selfintro.modules.donation.domain.Donation;
import com.selfintro.modules.donation.domain.DonationRepository;
import com.selfintro.modules.donation.domain.DonationStatus;
import com.selfintro.modules.donation.presentation.dto.DonationCreateResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class DonationServiceTest {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 17, 12, 0);

    @Mock
    private DonationRepository donationRepository;

    @Mock
    private PayAppClient payAppClient;

    private DonationService donationService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-07-17T03:00:00Z"), SEOUL);
        DonationProperties properties = new DonationProperties(1000, 100000,
                new DonationProperties.PayApp("https://api.payapp.kr/oapi/apiLoad.html",
                        "seller", "link-key", "link-value", "01000000000",
                        "http://localhost:8080/api/donations/payapp/callback",
                        "http://localhost:8080/api/donations/complete"));
        donationService = new DonationService(donationRepository, payAppClient, properties, clock);
    }

    @Test
    void createReturnsPayUrlAndStoresMulNo() {
        when(donationRepository.save(any(Donation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(payAppClient.payRequest(anyInt(), anyString()))
                .thenReturn(PayAppPayRequestResult.ok("mul-123", "https://pay.example/123"));

        DonationCreateResponse response = donationService.create(5000, "화이팅!");

        assertThat(response.payUrl()).isEqualTo("https://pay.example/123");
        assertThat(response.donationToken()).isNotBlank();
    }

    @Test
    void createRejectsAmountBelowMinimum() {
        assertThatThrownBy(() -> donationService.create(999, null))
                .isInstanceOf(IllegalArgumentException.class);
        verify(donationRepository, never()).save(any());
    }

    @Test
    void createRejectsAmountAboveMaximum() {
        assertThatThrownBy(() -> donationService.create(100001, null))
                .isInstanceOf(IllegalArgumentException.class);
        verify(donationRepository, never()).save(any());
    }

    @Test
    void createMarksFailedWhenPayAppRejects() {
        Donation donation = Donation.request(5000, null, NOW);
        when(donationRepository.save(any(Donation.class))).thenReturn(donation);
        when(payAppClient.payRequest(anyInt(), anyString()))
                .thenReturn(PayAppPayRequestResult.fail("잘못된 요청"));

        assertThatThrownBy(() -> donationService.create(5000, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(thrown -> assertThat(((ResponseStatusException) thrown).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_GATEWAY));
        assertThat(donation.getStatus()).isEqualTo(DonationStatus.FAILED);
    }

    @Test
    void createMarksFailedWhenPayAppThrows() {
        Donation donation = Donation.request(5000, null, NOW);
        when(donationRepository.save(any(Donation.class))).thenReturn(donation);
        when(payAppClient.payRequest(anyInt(), anyString()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "네트워크 오류"));

        assertThatThrownBy(() -> donationService.create(5000, null))
                .isInstanceOf(ResponseStatusException.class);
        assertThat(donation.getStatus()).isEqualTo(DonationStatus.FAILED);
    }

    @Test
    void getStatusReturnsStatusByClientToken() {
        Donation donation = Donation.request(5000, null, NOW);
        when(donationRepository.findByClientToken(donation.getClientToken()))
                .thenReturn(Optional.of(donation));

        assertThat(donationService.getStatus(donation.getClientToken()).status())
                .isEqualTo(DonationStatus.PENDING);
    }

    @Test
    void getStatusThrowsWhenTokenUnknown() {
        when(donationRepository.findByClientToken("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> donationService.getStatus("unknown"))
                .isInstanceOf(EntityNotFoundException.class);
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
        assertThat(donation.getStatus()).isEqualTo(DonationStatus.CANCELED);
    }

    @Test
    void callbackMarksDonationPaid() {
        Donation donation = pendingDonation("mul-123");
        when(donationRepository.findWithLockByMulNo("mul-123")).thenReturn(Optional.of(donation));

        boolean accepted = donationService.handleCallback(callbackParams("mul-123", "4", "5000"));

        assertThat(accepted).isTrue();
        assertThat(donation.getStatus()).isEqualTo(DonationStatus.PAID);
        assertThat(donation.getPaidAt()).isNotNull();
    }

    @Test
    void duplicatePaidCallbackIsIdempotentButStillAccepted() {
        Donation donation = pendingDonation("mul-123");
        when(donationRepository.findWithLockByMulNo("mul-123")).thenReturn(Optional.of(donation));

        donationService.handleCallback(callbackParams("mul-123", "4", "5000"));
        LocalDateTime firstPaidAt = donation.getPaidAt();
        boolean secondAccepted = donationService.handleCallback(callbackParams("mul-123", "4", "5000"));

        assertThat(secondAccepted).isTrue();
        assertThat(donation.getPaidAt()).isEqualTo(firstPaidAt);
        assertThat(donation.getStatus()).isEqualTo(DonationStatus.PAID);
    }

    @Test
    void cancelCallbackMarksDonationCanceled() {
        Donation donation = pendingDonation("mul-123");
        donation.markPaid(NOW, "4");
        when(donationRepository.findWithLockByMulNo("mul-123")).thenReturn(Optional.of(donation));

        boolean accepted = donationService.handleCallback(callbackParams("mul-123", "8", "5000"));

        assertThat(accepted).isTrue();
        assertThat(donation.getStatus()).isEqualTo(DonationStatus.CANCELED);
    }

    @Test
    void callbackRejectsWrongLinkValue() {
        Map<String, String> params = new java.util.HashMap<>(callbackParams("mul-123", "4", "5000"));
        params.put("linkval", "forged-value");

        assertThat(donationService.handleCallback(params)).isFalse();
        verify(donationRepository, never()).findWithLockByMulNo(anyString());
    }

    @Test
    void callbackRejectsMissingLinkValue() {
        Map<String, String> params = new java.util.HashMap<>(callbackParams("mul-123", "4", "5000"));
        params.remove("linkval");

        assertThat(donationService.handleCallback(params)).isFalse();
    }

    @Test
    void callbackRejectsUnknownMulNo() {
        when(donationRepository.findWithLockByMulNo("unknown")).thenReturn(Optional.empty());

        assertThat(donationService.handleCallback(callbackParams("unknown", "4", "5000"))).isFalse();
    }

    @Test
    void callbackRejectsPriceMismatch() {
        Donation donation = pendingDonation("mul-123");
        when(donationRepository.findWithLockByMulNo("mul-123")).thenReturn(Optional.of(donation));

        assertThat(donationService.handleCallback(callbackParams("mul-123", "4", "9999"))).isFalse();
        assertThat(donation.getStatus()).isEqualTo(DonationStatus.PENDING);
    }

    @Test
    void callbackAcknowledgesUnknownPayStateWithoutTransition() {
        Donation donation = pendingDonation("mul-123");
        when(donationRepository.findWithLockByMulNo("mul-123")).thenReturn(Optional.of(donation));

        assertThat(donationService.handleCallback(callbackParams("mul-123", "1", "5000"))).isTrue();
        assertThat(donation.getStatus()).isEqualTo(DonationStatus.PENDING);
    }

    private Donation pendingDonation(String mulNo) {
        Donation donation = Donation.request(5000, null, NOW);
        donation.assignMulNo(mulNo);
        return donation;
    }

    private Map<String, String> callbackParams(String mulNo, String payState, String price) {
        return Map.of("mul_no", mulNo, "pay_state", payState, "price", price, "linkval", "link-value");
    }

    @Test
    void assignMulNoKeepsFirstValue() {
        Donation donation = Donation.request(5000, null, NOW);
        donation.assignMulNo("first");
        donation.assignMulNo("second");
        assertThat(donation.getMulNo()).isEqualTo("first");
    }
}
