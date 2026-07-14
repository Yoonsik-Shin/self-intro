package com.selfintro.modules.experience.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "experience_detail")
public class ExperienceDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    protected ExperienceDetail() {
        // JPA standard constructor
    }

    private ExperienceDetail(Long id, String content, int displayOrder) {
        this.id = id;
        this.content = content;
        this.displayOrder = displayOrder;
    }

    public static ExperienceDetail create(String content, int displayOrder) {
        return new ExperienceDetail(null, content, displayOrder);
    }

    // Getters
    public Long getId() { return id; }
    public String getContent() { return content; }
    public int getDisplayOrder() { return displayOrder; }
}
