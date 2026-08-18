package com.selfintro.modules.auth.application;

import com.selfintro.modules.auth.domain.MfaRecoveryCode;
import com.selfintro.modules.auth.domain.MfaRecoveryCodeRepository;
import com.selfintro.modules.identity.application.RegistrationSecretHasher;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MfaRecoveryCodeService {

    private static final int CODE_COUNT = 10;
    private static final int RAW_CODE_LENGTH = 12;
    private static final char[] CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final MfaRecoveryCodeRepository repository;
    private final RegistrationSecretHasher hasher;

    @Transactional
    public List<String> replaceFor(Long userId) {
        repository.deleteAllByUserId(userId);
        LocalDateTime now = LocalDateTime.now();
        List<String> rawCodes = new ArrayList<>(CODE_COUNT);
        List<MfaRecoveryCode> entities = new ArrayList<>(CODE_COUNT);
        for (int index = 0; index < CODE_COUNT; index++) {
            String rawCode = newRawCode();
            rawCodes.add(rawCode);
            entities.add(MfaRecoveryCode.issue(userId, hasher.hash(normalize(rawCode)), now));
        }
        repository.saveAll(entities);
        return List.copyOf(rawCodes);
    }

    @Transactional
    public boolean consume(Long userId, String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            return false;
        }
        return repository
                .findByUserIdAndCodeHashAndConsumedAtIsNull(userId, hasher.hash(normalize(rawCode)))
                .map(
                        code -> {
                            code.consume(LocalDateTime.now());
                            return true;
                        })
                .orElse(false);
    }

    private String newRawCode() {
        StringBuilder encoded = new StringBuilder(RAW_CODE_LENGTH);
        for (int index = 0; index < RAW_CODE_LENGTH; index++) {
            encoded.append(CODE_ALPHABET[SECURE_RANDOM.nextInt(CODE_ALPHABET.length)]);
        }
        return encoded.substring(0, 4)
                + "-"
                + encoded.substring(4, 8)
                + "-"
                + encoded.substring(8, 12);
    }

    private String normalize(String value) {
        return value.replace("-", "").replace(" ", "").toUpperCase();
    }
}
