package com.selfintro.modules.experience.domain;

import com.selfintro.modules.skill.domain.Skill;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
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

    @Column(name = "essay_content", columnDefinition = "TEXT")
    private String essayContent;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "experience_id")
    @OrderBy("displayOrder ASC")
    private List<ExperienceDetail> details = new ArrayList<>();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "experience_skill",
        joinColumns = @JoinColumn(name = "experience_id"),
        inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    @OrderColumn(name = "list_order")
    private List<Skill> skills = new ArrayList<>();

    protected Experience() {
        // JPA standard constructor
    }

    protected Experience(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail> details, List<Skill> skills) {
        this.title = title;
        this.periodStart = periodStart;
        this.periodEnd = periodEnd;
        this.summary = summary;
        this.takeaway = takeaway;
        this.essayContent = essayContent;
        this.displayOrder = displayOrder;
        this.details = details != null ? details : new ArrayList<>();
        this.skills = skills != null ? skills : new ArrayList<>();
    }

    public void updateCommonFields(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail> details, List<Skill> skills) {
        this.title = title;
        this.periodStart = periodStart;
        this.periodEnd = periodEnd;
        this.summary = summary;
        this.takeaway = takeaway;
        this.essayContent = essayContent;
        this.displayOrder = displayOrder;
        
        this.details.clear();
        if (details != null) {
            this.details.addAll(details);
        }
        
        this.skills.clear();
        if (skills != null) {
            this.skills.addAll(skills);
        }
    }

    // Getters
    public Long getId() { return id; }
    public String getType() { return type; }
    public String getTitle() { return title; }
    public LocalDate getPeriodStart() { return periodStart; }
    public LocalDate getPeriodEnd() { return periodEnd; }
    public String getSummary() { return summary; }
    public String getTakeaway() { return takeaway; }
    public String getEssayContent() { return essayContent; }
    public int getDisplayOrder() { return displayOrder; }
    public List<ExperienceDetail> getDetails() { return details; }
    public List<Skill> getSkills() { return skills; }
}
