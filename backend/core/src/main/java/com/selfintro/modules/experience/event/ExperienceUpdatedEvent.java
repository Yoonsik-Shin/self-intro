package com.selfintro.modules.experience.event;

/**
 * 경험/프로젝트가 생성·수정되어 벡터 인덱스 재동기화가 필요함을 알리는 이벤트.
 * {@code content}는 이미 프롬프트/임베딩용으로 요약된 텍스트다({@code CareerProfileDigestBuilder.buildForExperience}).
 */
public record ExperienceUpdatedEvent(Long experienceId, String title, String content) {}
