package com.selfintro.modules.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.auth.domain.MfaRecoveryCode;
import com.selfintro.modules.auth.domain.MfaRecoveryCodeRepository;
import com.selfintro.modules.identity.application.RegistrationSecretHasher;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MfaRecoveryCodeServiceTest {

    @Mock private MfaRecoveryCodeRepository repository;

    private final RegistrationSecretHasher hasher = new RegistrationSecretHasher();

    @Test
    void replacesExistingCodesAndReturnsTenDistinctRawCodes() {
        MfaRecoveryCodeService service = new MfaRecoveryCodeService(repository, hasher);

        var rawCodes = service.replaceFor(42L);

        assertThat(rawCodes).hasSize(10).doesNotHaveDuplicates();
        assertThat(rawCodes)
                .allMatch(
                        code ->
                                code.matches(
                                        "[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}"));
        verify(repository).deleteAllByUserId(42L);
        verify(repository).saveAll(any());
    }

    @Test
    void consumesMatchingUnusedCodeOnce() {
        MfaRecoveryCodeService service = new MfaRecoveryCodeService(repository, hasher);
        MfaRecoveryCode code =
                MfaRecoveryCode.issue(42L, hasher.hash("ABCD1234EFGH"), LocalDateTime.now());
        when(repository.findByUserIdAndCodeHashAndConsumedAtIsNull(eq(42L), any()))
                .thenReturn(Optional.of(code));

        assertThat(service.consume(42L, "abcd-1234-efgh")).isTrue();
        assertThat(code.getConsumedAt()).isNotNull();

        ArgumentCaptor<byte[]> hashCaptor = ArgumentCaptor.forClass(byte[].class);
        verify(repository)
                .findByUserIdAndCodeHashAndConsumedAtIsNull(eq(42L), hashCaptor.capture());
        assertThat(hashCaptor.getValue()).isEqualTo(hasher.hash("ABCD1234EFGH"));
    }
}
