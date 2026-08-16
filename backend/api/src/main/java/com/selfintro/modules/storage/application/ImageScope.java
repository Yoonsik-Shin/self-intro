package com.selfintro.modules.storage.application;

public enum ImageScope {
    STUDY_GALLERY("study/gallery"),
    EXPERIENCE_GALLERY("experience/gallery"),
    STUDY_MARKDOWN("study/markdown"),
    PRINT_TEMPLATE_FINAL_PDF("print-template/final-pdf"),
    PORTFOLIO_ARCHITECTURE("portfolio/architecture"),
    JOB_POSTING_SCREENSHOT("job-posting/screenshot"),
    WORKSPACE_JOB_POSTING_SCREENSHOT_TEMP("job-posting/screenshot-temp");

    private final String prefix;

    ImageScope(String prefix) {
        this.prefix = prefix;
    }

    public String prefix() {
        return prefix;
    }
}
