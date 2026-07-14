package com.selfintro.modules.profile.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "profile")
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(name = "name_en", nullable = false, length = 60)
    private String nameEn;

    @Column(name = "job_title", nullable = false, length = 80)
    private String jobTitle;

    @Column(nullable = false, length = 500)
    private String bio;

    @Column(name = "career_summary", nullable = false, length = 120)
    private String careerSummary;

    @Column(name = "core_stack_summary", nullable = false, length = 120)
    private String coreStackSummary;

    @Column(name = "status_badge_text", nullable = false, length = 160)
    private String statusBadgeText;

    @Column(name = "github_url", nullable = false, length = 255)
    private String githubUrl;

    @Column(nullable = false, length = 120)
    private String email;

    @Column(nullable = false, length = 30)
    private String phone;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Profile() {
        // JPA standard constructor
    }

    private Profile(String name, String nameEn, String jobTitle, String bio, String careerSummary, String coreStackSummary, String statusBadgeText, String githubUrl, String email, String phone) {
        this.name = name;
        this.nameEn = nameEn;
        this.jobTitle = jobTitle;
        this.bio = bio;
        this.careerSummary = careerSummary;
        this.coreStackSummary = coreStackSummary;
        this.statusBadgeText = statusBadgeText;
        this.githubUrl = githubUrl;
        this.email = email;
        this.phone = phone;
        this.updatedAt = LocalDateTime.now();
    }

    public static Profile create(String name, String nameEn, String jobTitle, String bio, String careerSummary, String coreStackSummary, String statusBadgeText, String githubUrl, String email, String phone) {
        return new Profile(name, nameEn, jobTitle, bio, careerSummary, coreStackSummary, statusBadgeText, githubUrl, email, phone);
    }

    public void update(String name, String nameEn, String jobTitle, String bio, String careerSummary, String coreStackSummary, String statusBadgeText, String githubUrl, String email, String phone) {
        this.name = name;
        this.nameEn = nameEn;
        this.jobTitle = jobTitle;
        this.bio = bio;
        this.careerSummary = careerSummary;
        this.coreStackSummary = coreStackSummary;
        this.statusBadgeText = statusBadgeText;
        this.githubUrl = githubUrl;
        this.email = email;
        this.phone = phone;
        this.updatedAt = LocalDateTime.now();
    }

    // Standard Java Getters
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getNameEn() { return nameEn; }
    public String getJobTitle() { return jobTitle; }
    public String getBio() { return bio; }
    public String getCareerSummary() { return careerSummary; }
    public String getCoreStackSummary() { return coreStackSummary; }
    public String getStatusBadgeText() { return statusBadgeText; }
    public String getGithubUrl() { return githubUrl; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
