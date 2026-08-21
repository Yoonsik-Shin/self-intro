package com.selfintro.global.ai;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class AiPromptPolicyTest {

    private final AiPromptPolicy policy = new AiPromptPolicy();

    @BeforeEach
    void enable() {
        ReflectionTestUtils.setField(policy, "enforcementEnabled", true);
    }

    @Test
    void blocksDirectIdentifiersAndSecrets() {
        assertThatThrownBy(() -> policy.validate("system", "연락처는 test@example.com 입니다"))
                .isInstanceOf(AiPolicyViolationException.class);
        assertThatThrownBy(() -> policy.validate("system", "key=sk-abcdefghijklmnopqrstuvwxyz1234"))
                .isInstanceOf(AiPolicyViolationException.class);
    }

    @Test
    void acceptsDeidentifiedEvidence() {
        assertThatCode(
                        () ->
                                policy.validate(
                                        "근거만 사용하세요.", "evidence_id=exp-12, 결과=Redis SCAN 기반 정리"))
                .doesNotThrowAnyException();
    }
}
