package com.selfintro.modules.identity.application;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class RegistrationPasswordPolicyTest {

    private final RegistrationPasswordPolicy policy = new RegistrationPasswordPolicy();

    @Test
    void acceptsStrongPasswordThatIsNotInBlocklist() {
        assertThatCode(() -> policy.validate("SaaS-Beta-2026!")).doesNotThrowAnyException();
    }

    @Test
    void rejectsCommonPasswordRegardlessOfLetterCase() {
        assertThatThrownBy(() -> policy.validate("Password123!"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("널리 사용되는 취약 비밀번호는 사용할 수 없습니다.");
    }

    @Test
    void keepsCompositionRulesAtServerBoundary() {
        assertThatThrownBy(() -> policy.validate("all-lowercase1!"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("비밀번호에는 영문 대문자가 필요합니다.");
    }
}
