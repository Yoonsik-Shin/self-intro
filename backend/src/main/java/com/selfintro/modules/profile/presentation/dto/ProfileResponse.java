package com.selfintro.modules.profile.presentation.dto;

import com.selfintro.modules.profile.domain.Profile;
import java.time.LocalDateTime;

public record ProfileResponse(
        Long id,
        String name,
        String nameEn,
        String jobTitle,
        String bio,
        String coreStackSummary,
        String statusBadgeText,
        String githubUrl,
        String email,
        String phone,
        LocalDateTime updatedAt) {
    public static ProfileResponse from(Profile profile) {
        return new ProfileResponse(
                profile.getId(),
                profile.getName(),
                profile.getNameEn(),
                profile.getJobTitle(),
                profile.getBio(),
                profile.getCoreStackSummary(),
                profile.getStatusBadgeText(),
                profile.getGithubUrl(),
                profile.getEmail(),
                profile.getPhone(),
                profile.getUpdatedAt());
    }
}
