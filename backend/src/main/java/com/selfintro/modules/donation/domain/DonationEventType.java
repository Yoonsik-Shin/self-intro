package com.selfintro.modules.donation.domain;

public enum DonationEventType {
    /** 방문자가 후원을 생성함 (PENDING) */
    CREATED,
    /** 페이앱 payrequest 성공, mul_no 발급 */
    PAY_REQUESTED,
    /** 페이앱 payrequest 실패 (FAILED) */
    PAY_FAILED,
    /** 결제완료 콜백 반영 (PAID) */
    PAID,
    /** 취소/환불 반영 (CANCELED) */
    CANCELED,
    /** 검증에 걸려 거부된 콜백 (상태 변경 없음, 감사 기록용) */
    CALLBACK_REJECTED
}
