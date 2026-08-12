package com.selfintro.modules.profile.domain.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "profile")
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(name = "name_en", nullable = false, length = 60)
    private String nameEn;

    @Column(name = "job_title", nullable = false, length = 80)
    private String jobTitle;

    @Column(nullable = false, length = 500)
    private String bio;

    @Column(name = "core_stack_summary", nullable = false, length = 120)
    private String coreStackSummary;

    @Column(name = "status_badge_text", nullable = false, length = 160)
    private String statusBadgeText;

    @Column(name = "github_url", nullable = false, length = 255)
    private String githubUrl;

    @Column(nullable = false, length = 120)
    private String email;

    @Column(name = "public_email", nullable = false)
    private boolean publicEmail;

    @Column(nullable = false, length = 30)
    private String phone;

    @Column(name = "public_phone", nullable = false)
    private boolean publicPhone;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Profile() {
        // JPA standard constructor
    }

    private Profile(
            Long workspaceId,
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
            boolean publicPhone) {
        this.workspaceId = workspaceId;
        this.name = name;
        this.nameEn = nameEn;
        this.jobTitle = jobTitle;
        this.bio = bio;
        this.coreStackSummary = coreStackSummary;
        this.statusBadgeText = statusBadgeText;
        this.githubUrl = githubUrl;
        this.email = email;
        this.phone = phone;
        this.publicEmail = publicEmail;
        this.publicPhone = publicPhone;
        this.updatedAt = LocalDateTime.now();
    }

    public static Profile create(
            Long workspaceId,
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
            boolean publicPhone) {
        return new Profile(
                workspaceId,
                name,
                nameEn,
                jobTitle,
                bio,
                coreStackSummary,
                statusBadgeText,
                githubUrl,
                email,
                phone,
                publicEmail,
                publicPhone);
    }

    public void update(
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
            boolean publicPhone) {
        this.name = name;
        this.nameEn = nameEn;
        this.jobTitle = jobTitle;
        this.bio = bio;
        this.coreStackSummary = coreStackSummary;
        this.statusBadgeText = statusBadgeText;
        this.githubUrl = githubUrl;
        this.email = email;
        this.phone = phone;
        this.publicEmail = publicEmail;
        this.publicPhone = publicPhone;
        this.updatedAt = LocalDateTime.now();
    }

    // Standard Java Getters
    public Long getId() {
        return id;
    }

    public Long getWorkspaceId() {
        return workspaceId;
    }

    public String getName() {
        return name;
    }

    public String getNameEn() {
        return nameEn;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public String getBio() {
        return bio;
    }

    public String getCoreStackSummary() {
        return coreStackSummary;
    }

    public String getStatusBadgeText() {
        return statusBadgeText;
    }

    public String getGithubUrl() {
        return githubUrl;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public boolean isPublicEmail() {
        return publicEmail;
    }

    public boolean isPublicPhone() {
        return publicPhone;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
