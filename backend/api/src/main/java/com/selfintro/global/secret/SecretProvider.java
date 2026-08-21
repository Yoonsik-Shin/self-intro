package com.selfintro.global.secret;

public interface SecretProvider {

    String store(String namespace, String value);

    String resolve(String reference);

    void revoke(String reference);
}
