package com.selfintro.modules.donation.application;

public record PayAppPayRequestResult(boolean success, String mulNo, String payUrl, String errorMessage) {

    public static PayAppPayRequestResult ok(String mulNo, String payUrl) {
        return new PayAppPayRequestResult(true, mulNo, payUrl, null);
    }

    public static PayAppPayRequestResult fail(String errorMessage) {
        return new PayAppPayRequestResult(false, null, null, errorMessage);
    }
}
