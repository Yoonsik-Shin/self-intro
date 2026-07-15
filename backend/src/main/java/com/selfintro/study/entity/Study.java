package com.selfintro.study.entity;

import com.selfintro.modules.experience.domain.Experience;
import com.selfintro.modules.experience.domain.ExperienceDetail;
import com.selfintro.modules.skill.domain.Skill;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "study")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Study {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 160)
    private String slug;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 500)
    private String summary;

    @Column(name = "content_markdown", nullable = false, columnDefinition = "LONGTEXT")
    private String contentMarkdown;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StudyStatus status;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private StudyCategory category;

    @ManyToMany
    @JoinTable(
            name = "study_tag",
            joinColumns = @JoinColumn(name = "study_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @OrderBy("name ASC")
    private List<Tag> tags = new ArrayList<>();

    @ManyToMany
    @JoinTable(
            name = "study_skill",
            joinColumns = @JoinColumn(name = "study_id"),
            inverseJoinColumns = @JoinColumn(name = "skill_id"))
    @OrderBy("displayOrder ASC")
    private List<Skill> skills = new ArrayList<>();

    @ManyToMany
    @JoinTable(
            name = "study_experience",
            joinColumns = @JoinColumn(name = "study_id"),
            inverseJoinColumns = @JoinColumn(name = "experience_id"))
    @OrderBy("displayOrder ASC")
    private List<Experience> experiences = new ArrayList<>();

    @ManyToMany
    @JoinTable(
            name = "study_experience_detail",
            joinColumns = @JoinColumn(name = "study_id"),
            inverseJoinColumns = @JoinColumn(name = "experience_detail_id"))
    @OrderBy("displayOrder ASC")
    private List<ExperienceDetail> experienceDetails = new ArrayList<>();

    @OneToMany(mappedBy = "source", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<StudyRelation> relations = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "study_id")
    @OrderBy("displayOrder ASC")
    private List<StudyImage> images = new ArrayList<>();

    @Column(name = "learned_at", nullable = false)
    private LocalDate learnedAt;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private Study(String slug, String title, String summary, String contentMarkdown,
                  StudyStatus status, StudyCategory category, LocalDate learnedAt,
                  LocalDateTime publishedAt) {
        this.slug = slug;
        this.title = title;
        this.summary = summary;
        this.contentMarkdown = contentMarkdown;
        this.status = status;
        this.category = category;
        this.learnedAt = learnedAt;
        this.publishedAt = publishedAt;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    public static Study create(String slug, String title, String summary, String contentMarkdown,
                               StudyStatus status, StudyCategory category, LocalDate learnedAt,
                               LocalDateTime publishedAt) {
        return new Study(slug, title, summary, contentMarkdown, status, category, learnedAt, publishedAt);
    }

    public void update(String slug, String title, String summary, String contentMarkdown,
                       StudyStatus status, StudyCategory category, LocalDate learnedAt,
                       LocalDateTime publishedAt) {
        this.slug = slug;
        this.title = title;
        this.summary = summary;
        this.contentMarkdown = contentMarkdown;
        this.status = status;
        this.category = category;
        this.learnedAt = learnedAt;
        this.publishedAt = publishedAt;
        this.updatedAt = LocalDateTime.now();
    }

    public void replaceTags(Collection<Tag> values) {
        tags.clear();
        tags.addAll(values);
    }

    public void replaceSkills(Collection<Skill> values) {
        skills.clear();
        skills.addAll(values);
    }

    public void replaceExperiences(Collection<Experience> values) {
        experiences.clear();
        experiences.addAll(values);
    }

    public void replaceExperienceDetails(Collection<ExperienceDetail> values) {
        experienceDetails.clear();
        experienceDetails.addAll(values);
    }

    public void replaceRelations(Collection<StudyRelation> values) {
        relations.removeIf(existing -> values.stream().noneMatch(incoming -> existing.sameTargetAndType(incoming)));
        for (StudyRelation incoming : values) {
            relations.stream()
                    .filter(existing -> existing.sameTargetAndType(incoming))
                    .findFirst()
                    .ifPresentOrElse(
                            existing -> existing.updateDisplayOrder(incoming.getDisplayOrder()),
                            () -> relations.add(incoming));
        }
        relations.sort(java.util.Comparator.comparingInt(StudyRelation::getDisplayOrder));
    }

    public void setSkillLinked(Skill skill, boolean linked) {
        boolean alreadyLinked = skills.stream().anyMatch(value -> value.getId().equals(skill.getId()));
        if (linked && !alreadyLinked) {
            skills.add(skill);
        } else if (!linked && alreadyLinked) {
            skills.removeIf(value -> value.getId().equals(skill.getId()));
        }
    }

    public void setExperienceLinked(Experience experience, boolean linked) {
        boolean alreadyLinked = experiences.stream().anyMatch(value -> value.getId().equals(experience.getId()));
        if (linked && !alreadyLinked) {
            experiences.add(experience);
        } else if (!linked && alreadyLinked) {
            experiences.removeIf(value -> value.getId().equals(experience.getId()));
        }
    }

    public void setExperienceDetailLinked(ExperienceDetail detail, boolean linked) {
        boolean alreadyLinked = experienceDetails.stream().anyMatch(value -> value.getId().equals(detail.getId()));
        if (linked && !alreadyLinked) {
            experienceDetails.add(detail);
        } else if (!linked && alreadyLinked) {
            experienceDetails.removeIf(value -> value.getId().equals(detail.getId()));
        }
    }

    public List<String> imageObjectKeysNotIn(List<StudyImage.Draft> incoming) {
        return images.stream()
                .filter(existing -> incoming.stream().noneMatch(draft -> existing.getId().equals(draft.id())))
                .map(StudyImage::getObjectKey)
                .toList();
    }

    public void reconcileImages(List<StudyImage.Draft> incoming) {
        images.removeIf(existing -> incoming.stream().noneMatch(draft -> existing.getId().equals(draft.id())));

        for (StudyImage.Draft draft : incoming) {
            if (draft.id() != null) {
                images.stream()
                        .filter(existing -> draft.id().equals(existing.getId()))
                        .findFirst()
                        .ifPresent(existing -> existing.updateDisplayOrder(draft.displayOrder()));
            } else {
                images.add(StudyImage.create(draft.objectKey(), draft.displayOrder()));
            }
        }

        images.sort(java.util.Comparator.comparingInt(StudyImage::getDisplayOrder));
    }
}
