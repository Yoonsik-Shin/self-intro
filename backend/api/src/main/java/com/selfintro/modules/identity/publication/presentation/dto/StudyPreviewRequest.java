package com.selfintro.modules.identity.publication.presentation.dto;

/** null이면 저장된 초안을 그대로 쓴다. */
public record StudyPreviewRequest(PublicStudyDraft study) {}
