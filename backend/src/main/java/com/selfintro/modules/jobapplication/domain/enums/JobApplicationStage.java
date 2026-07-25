package com.selfintro.modules.jobapplication.domain.enums;

public enum JobApplicationStage {
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

    public boolean isTerminal() {
        return this == OFFER || this == REJECTED || this == WITHDRAWN;
    }
}
