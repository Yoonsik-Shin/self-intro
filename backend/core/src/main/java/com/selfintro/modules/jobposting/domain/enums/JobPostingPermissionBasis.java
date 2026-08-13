package com.selfintro.modules.jobposting.domain.enums;

/** 공고 원문을 플랫폼 공통 카탈로그에 재노출할 수 있는 권한 근거입니다. */
public enum JobPostingPermissionBasis {
    UNKNOWN(false),
    EMPLOYER_DIRECT_SUBMISSION(true),
    WRITTEN_LICENSE(true),
    OFFICIAL_API_LICENSE(true);

    private final boolean shareable;

    JobPostingPermissionBasis(boolean shareable) {
        this.shareable = shareable;
    }

    public boolean isShareable() {
        return shareable;
    }
}
