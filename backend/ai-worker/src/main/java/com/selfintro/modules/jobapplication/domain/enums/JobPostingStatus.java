package com.selfintro.modules.jobapplication.domain.enums;

import java.util.EnumSet;
import java.util.Set;

/**
 * 채용 공고 하나의 전 생애주기를 하나의 상태값으로 표현한다. 지원 전(NEW~EXPIRED)과 지원 후(APPLIED~WITHDRAWN)를 별도 엔티티로 나누지 않고 한
 * 엔티티가 이 값을 따라 자연스럽게 흘러간다 — "지원 전환"은 새 행을 만드는 게 아니라 같은 행의 상태를 APPLIED로 바꾸는 것뿐이다.
 */
public enum JobPostingStatus {
    NEW,
    SAVED,
    DISMISSED,
    EXPIRED,
    APPLIED,
    CODING_TEST,
    ASSIGNMENT,
    APTITUDE_TEST,
    INTERVIEW_1,
    INTERVIEW_2,
    FINAL_INTERVIEW,
    OFFER,
    REJECTED,
    WITHDRAWN;

    private static final Set<JobPostingStatus> PRE_APPLICATION =
            EnumSet.of(NEW, SAVED, DISMISSED, EXPIRED);

    /** 아직 지원하지 않은 수집 후보 단계인지 — 프론트의 "수집된 공고" 목록과 "지원 공고" 보드를 가르는 기준이다. */
    public boolean isPreApplication() {
        return PRE_APPLICATION.contains(this);
    }

    public boolean isTerminal() {
        return this == OFFER || this == REJECTED || this == WITHDRAWN;
    }
}
