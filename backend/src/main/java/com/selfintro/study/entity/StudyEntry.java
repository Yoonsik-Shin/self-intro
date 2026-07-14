package com.selfintro.study.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 1200)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StudyCategory category;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "study_entry_skill", joinColumns = @JoinColumn(name = "study_entry_id"))
    @Column(name = "skill", nullable = false, length = 60)
    private List<String> skills = new ArrayList<>();

    @Column(nullable = false, length = 800)
    private String takeaway;

    @Column(nullable = false)
    private LocalDate learnedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private StudyEntry(String title, String description, StudyCategory category, List<String> skills, String takeaway, LocalDate learnedAt) {
        this.title = title;
        this.description = description;
        this.category = category;
        this.skills = new ArrayList<>(skills);
        this.takeaway = takeaway;
        this.learnedAt = learnedAt;
        this.createdAt = LocalDateTime.now();
    }

    public static StudyEntry create(String title, String description, StudyCategory category, List<String> skills, String takeaway, LocalDate learnedAt) {
        return new StudyEntry(title, description, category, skills, takeaway, learnedAt);
    }

    public void update(String title, String description, StudyCategory category, List<String> skills, String takeaway, LocalDate learnedAt) {
        this.title = title;
        this.description = description;
        this.category = category;
        this.skills = new ArrayList<>(skills);
        this.takeaway = takeaway;
        this.learnedAt = learnedAt;
    }
}
