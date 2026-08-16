package com.selfintro.modules.auth.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AccountDisplayNameRequest(
        @NotBlank(message = "닉네임을 입력해 주세요.")
                @Size(min = 2, max = 40, message = "닉네임은 2~40자로 입력해 주세요.")
                @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}]+$", message = "닉네임에 제어 문자를 사용할 수 없습니다.")
                String displayName) {}
