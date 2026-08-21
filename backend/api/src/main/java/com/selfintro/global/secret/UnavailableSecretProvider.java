package com.selfintro.global.secret;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class UnavailableSecretProvider implements SecretProvider {

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE, "Secret Manager가 구성되지 않았습니다.");
    }

    @Override
    public String store(String namespace, String value) {
        throw unavailable();
    }

    @Override
    public String resolve(String reference) {
        throw unavailable();
    }

    @Override
    public void revoke(String reference) {
        throw unavailable();
    }
}
