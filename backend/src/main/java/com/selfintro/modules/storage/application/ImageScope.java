package com.selfintro.modules.storage.application;

public enum ImageScope {
    STUDY_GALLERY("study/gallery"),
    EXPERIENCE_GALLERY("experience/gallery"),
    STUDY_MARKDOWN("study/markdown");

    private final String prefix;

    ImageScope(String prefix) {
        this.prefix = prefix;
    }

    public String prefix() {
        return prefix;
    }
}
