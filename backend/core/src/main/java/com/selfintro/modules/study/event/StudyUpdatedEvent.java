package com.selfintro.modules.study.event;

/**
 * 스터디가 생성·수정되어 벡터 인덱스 재동기화가 필요함을 알리는 이벤트.
 * {@code content}는 스터디 본문 마크다운 원문이다(청킹 대상 텍스트).
 */
public record StudyUpdatedEvent(Long studyId, String title, String content) {}
