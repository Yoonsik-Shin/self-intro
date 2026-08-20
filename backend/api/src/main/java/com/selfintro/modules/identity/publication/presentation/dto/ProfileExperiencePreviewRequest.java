package com.selfintro.modules.identity.publication.presentation.dto;

/** null인 필드는 저장된 초안을 그대로 쓰고, 채워진 필드만 미리보기 계산에 덮어써진다. */
public record ProfileExperiencePreviewRequest(
        PublicProfileDraft profile, PublicExperienceDraft experience) {}
