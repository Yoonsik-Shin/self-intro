package com.selfintro.modules.architecture.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "architecture_overview")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ArchitectureOverview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String heading;

    @Column(nullable = false, length = 500)
    private String subheading;

    @Column(name = "diagram_heading", nullable = false, length = 200)
    private String diagramHeading;

    @Column(name = "diagram_text", nullable = false, columnDefinition = "TEXT")
    private String diagramText;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private ArchitectureOverview(String heading, String subheading, String diagramHeading, String diagramText) {
        this.heading = heading;
        this.subheading = subheading;
        this.diagramHeading = diagramHeading;
        this.diagramText = diagramText;
        this.updatedAt = LocalDateTime.now();
    }

    public static ArchitectureOverview create(String heading, String subheading, String diagramHeading, String diagramText) {
        return new ArchitectureOverview(heading, subheading, diagramHeading, diagramText);
    }

    public void update(String heading, String subheading, String diagramHeading, String diagramText) {
        this.heading = heading;
        this.subheading = subheading;
        this.diagramHeading = diagramHeading;
        this.diagramText = diagramText;
        this.updatedAt = LocalDateTime.now();
    }
}
