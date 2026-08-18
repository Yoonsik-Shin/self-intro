package com.selfintro.modules.auth.presentation.dto;

import jakarta.validation.constraints.Pattern;

public record MfaCodeRequest(@Pattern(regexp = "\\d{6}") String code) {}
