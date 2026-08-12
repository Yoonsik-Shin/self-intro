package com.selfintro.modules.identity.domain;

public enum WorkspacePurgeJobStatus {
    PENDING_GRACE,
    BLOCKED,
    READY,
    PURGING,
    COMPLETED,
    FAILED,
    CANCELLED
}
