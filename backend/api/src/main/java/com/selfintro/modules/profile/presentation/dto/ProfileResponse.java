package com.selfintro.modules.profile.presentation.dto;

import com.selfintro.modules.profile.domain.entity.Profile;
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
        boolean publicEmail,
        boolean publicPhone,
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
                profile.isPublicEmail(),
                profile.isPublicPhone(),
                profile.getUpdatedAt());
    }

    public static ProfileResponse fromPublic(Profile profile) {
        return new ProfileResponse(
                profile.getId(),
                profile.getName(),
                profile.getNameEn(),
                profile.getJobTitle(),
                profile.getBio(),
                profile.getCoreStackSummary(),
                profile.getStatusBadgeText(),
                profile.getGithubUrl(),
                profile.isPublicEmail() ? profile.getEmail() : null,
                profile.isPublicPhone() ? profile.getPhone() : null,
                profile.isPublicEmail(),
                profile.isPublicPhone(),
                profile.getUpdatedAt());
    }

    public ProfileResponse forPublication(
            boolean showName,
            boolean showNameEn,
            boolean showJobTitle,
            boolean showBio,
            boolean showCoreStackSummary,
            boolean showStatusBadge,
            boolean showGithub,
            boolean showEmail,
            boolean showPhone) {
        return new ProfileResponse(
                id,
                showName ? name : null,
                showNameEn ? nameEn : null,
                showJobTitle ? jobTitle : null,
                showBio ? bio : null,
                showCoreStackSummary ? coreStackSummary : null,
                showStatusBadge ? statusBadgeText : null,
                showGithub ? githubUrl : null,
                showEmail ? email : null,
                showPhone ? phone : null,
                showEmail,
                showPhone,
                updatedAt);
    }
}
