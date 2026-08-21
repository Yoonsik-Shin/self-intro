package com.selfintro.global.secret;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@Profile("local")
@ConditionalOnProperty(name = "app.secrets.provider", havingValue = "local-memory")
public class LocalMemorySecretProvider implements SecretProvider {

    private final Map<String, String> secrets = new ConcurrentHashMap<>();

    @Override
    public String store(String namespace, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Secret value must not be blank");
        }
        String reference = "local-memory://" + UUID.randomUUID();
        secrets.put(reference, value);
        return reference;
    }

    @Override
    public String resolve(String reference) {
        String value = secrets.get(reference);
        if (value == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "로컬 Secret이 만료되었습니다. 결제수단을 다시 등록해 주세요.");
        }
        return value;
    }

    @Override
    public void revoke(String reference) {
        secrets.remove(reference);
    }
}
