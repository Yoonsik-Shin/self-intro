package com.selfintro.modules.experience.domain;

import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.study.entity.Tag;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "experience")
@Inheritance(strategy = InheritanceType.JOINED)
@DiscriminatorColumn(name = "type")
public abstract class Experience {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "type", insertable = false, updatable = false)
    private String type;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end")
    private LocalDate periodEnd;

    @Column(length = 300)
    private String summary;

    @Column(length = 500)
    private String takeaway;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "show_on_timeline", nullable = false)
    private boolean showOnTimeline;

    @Column(name = "timeline_label", length = 60)
    private String timelineLabel;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "experience_id")
    @OrderBy("displayOrder ASC")
    private List<ExperienceDetail> details = new ArrayList<>();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "experience_skill",
            joinColumns = @JoinColumn(name = "experience_id"),
            inverseJoinColumns = @JoinColumn(name = "skill_id"))
    @OrderColumn(name = "list_order")
    private List<Skill> skills = new ArrayList<>();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "experience_tag",
            joinColumns = @JoinColumn(name = "experience_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @OrderBy("name ASC")
    private List<Tag> tags = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "experience_id")
    @OrderBy("displayOrder ASC")
    private List<ExperienceImage> images = new ArrayList<>();

    protected Experience() {
        // JPA standard constructor
    }

    protected Experience(
            String title,
            LocalDate periodStart,
            LocalDate periodEnd,
            String summary,
            String takeaway,
            int displayOrder,
            List<ExperienceDetail.Draft> details,
            List<Skill> skills,
            boolean showOnTimeline,
            String timelineLabel) {
        this.title = title;
        this.periodStart = periodStart;
        this.periodEnd = periodEnd;
        this.summary = summary;
        this.takeaway = takeaway;
        this.displayOrder = displayOrder;
        this.details = toEntities(details);
        this.skills = skills != null ? skills : new ArrayList<>();
        this.showOnTimeline = showOnTimeline;
        this.timelineLabel = timelineLabel;
    }

    public void updateCommonFields(
            String title,
            LocalDate periodStart,
            LocalDate periodEnd,
            String summary,
            String takeaway,
            int displayOrder,
            List<ExperienceDetail.Draft> details,
            List<Skill> skills,
            boolean showOnTimeline,
            String timelineLabel) {
        this.title = title;
        this.periodStart = periodStart;
        this.periodEnd = periodEnd;
        this.summary = summary;
        this.takeaway = takeaway;
        this.displayOrder = displayOrder;
        this.showOnTimeline = showOnTimeline;
        this.timelineLabel = timelineLabel;

        reconcileDetails(details != null ? details : List.of());

        this.skills.clear();
        if (skills != null) {
            this.skills.addAll(skills);
        }
    }

    public void changeShowOnTimeline(boolean showOnTimeline) {
        this.showOnTimeline = showOnTimeline;
    }

    public void changeDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }

    private static List<ExperienceDetail> toEntities(List<ExperienceDetail.Draft> drafts) {
        if (drafts == null) {
            return new ArrayList<>();
        }
        return drafts.stream()
                .map(
                        d ->
                                ExperienceDetail.create(
                                        d.content(),
                                        d.situation(),
                                        d.task(),
                                        d.actionDetail(),
                                        d.outcome(),
                                        d.narrative(),
                                        d.visible(),
                                        d.displayOrder(),
                                        d.skills()))
                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
    }

    /**
     * Merges incoming detail data into the existing collection in place instead of clearing and
     * re-adding, so that unchanged/edited items keep their IDENTITY-generated id (detail pages link
     * to these ids, and a clear()+addAll() on this unidirectional bag would otherwise cause
     * Hibernate to delete and re-insert every row on every save).
     */
    private void reconcileDetails(List<ExperienceDetail.Draft> incoming) {
        this.details.removeIf(
                existing ->
                        existing.getId() == null
                                || incoming.stream()
                                        .noneMatch(d -> existing.getId().equals(d.id())));

        for (ExperienceDetail.Draft d : incoming) {
            if (d.id() != null) {
                this.details.stream()
                        .filter(existing -> d.id().equals(existing.getId()))
                        .findFirst()
                        .ifPresent(
                                existing ->
                                        existing.update(
                                                d.content(),
                                                d.situation(),
                                                d.task(),
                                                d.actionDetail(),
                                                d.outcome(),
                                                d.narrative(),
                                                d.visible(),
                                                d.displayOrder(),
                                                d.skills()));
            } else {
                this.details.add(
                        ExperienceDetail.create(
                                d.content(),
                                d.situation(),
                                d.task(),
                                d.actionDetail(),
                                d.outcome(),
                                d.narrative(),
                                d.visible(),
                                d.displayOrder(),
                                d.skills()));
            }
        }

        this.details.sort(java.util.Comparator.comparingInt(ExperienceDetail::getDisplayOrder));
    }

    public void replaceTags(Collection<Tag> values) {
        tags.clear();
        tags.addAll(values);
    }

    public void setSkillLinked(Skill skill, boolean linked) {
        boolean alreadyLinked =
                skills.stream().anyMatch(value -> value.getId().equals(skill.getId()));
        if (linked && !alreadyLinked) {
            skills.add(skill);
        } else if (!linked && alreadyLinked) {
            skills.removeIf(value -> value.getId().equals(skill.getId()));
        }
    }

    public List<String> imageObjectKeysNotIn(List<ExperienceImage.Draft> incoming) {
        return images.stream()
                .filter(
                        existing ->
                                incoming.stream()
                                        .noneMatch(draft -> existing.getId().equals(draft.id())))
                .map(ExperienceImage::getObjectKey)
                .toList();
    }

    public void reconcileImages(List<ExperienceImage.Draft> incoming) {
        images.removeIf(
                existing ->
                        incoming.stream().noneMatch(draft -> existing.getId().equals(draft.id())));

        for (ExperienceImage.Draft draft : incoming) {
            if (draft.id() != null) {
                images.stream()
                        .filter(existing -> draft.id().equals(existing.getId()))
                        .findFirst()
                        .ifPresent(existing -> existing.updateDisplayOrder(draft.displayOrder()));
            } else {
                images.add(ExperienceImage.create(draft.objectKey(), draft.displayOrder()));
            }
        }

        images.sort(java.util.Comparator.comparingInt(ExperienceImage::getDisplayOrder));
    }

    // Getters
    public Long getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public String getTitle() {
        return title;
    }

    public LocalDate getPeriodStart() {
        return periodStart;
    }

    public LocalDate getPeriodEnd() {
        return periodEnd;
    }

    public String getSummary() {
        return summary;
    }

    public String getTakeaway() {
        return takeaway;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public boolean isShowOnTimeline() {
        return showOnTimeline;
    }

    public String getTimelineLabel() {
        return timelineLabel;
    }

    public List<ExperienceDetail> getDetails() {
        return details;
    }

    public List<Skill> getSkills() {
        return skills;
    }

    public List<Tag> getTags() {
        return tags;
    }

    public List<ExperienceImage> getImages() {
        return images;
    }
}
