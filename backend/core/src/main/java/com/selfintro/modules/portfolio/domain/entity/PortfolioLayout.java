package com.selfintro.modules.portfolio.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 포트폴리오 케이스스터디의 배치(WYSIWYG) 설정. {@code PrintTemplate}과 동일하게 각 필드는 프론트가
 * 직렬화한 JSON 문자열을 그대로 저장/반환하는 불투명 값이고, 백엔드는 구조를 해석하지 않는다.
 */
@Getter
@Entity
@Table(name = "portfolio_layout")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PortfolioLayout {

    public static final String ORIENTATION_PORTRAIT = "PORTRAIT";
    public static final String ORIENTATION_LANDSCAPE = "LANDSCAPE";
    public static final String SOURCE_AI = "AI";
    public static final String SOURCE_MANUAL = "MANUAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_study_id", nullable = false)
    private Long caseStudyId;

    @Column(nullable = false, length = 10)
    private String orientation;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 10)
    private String source;

    @Column(name = "excluded_ids_json", columnDefinition = "LONGTEXT")
    private String excludedIdsJson;

    @Column(name = "section_order_json", columnDefinition = "LONGTEXT")
    private String sectionOrderJson;

    @Column(name = "section_gaps_json", columnDefinition = "LONGTEXT")
    private String sectionGapsJson;

    @Column(name = "item_order_overrides_json", columnDefinition = "LONGTEXT")
    private String itemOrderOverridesJson;

    @Column(name = "forced_page_overrides_json", columnDefinition = "LONGTEXT")
    private String forcedPageOverridesJson;

    @Column(name = "content_overrides_json", columnDefinition = "LONGTEXT")
    private String contentOverridesJson;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static PortfolioLayout create(
            Long caseStudyId,
            String orientation,
            String name,
            String source,
            String excludedIdsJson,
            String sectionOrderJson,
            String sectionGapsJson,
            String itemOrderOverridesJson,
            String forcedPageOverridesJson,
            String contentOverridesJson,
            boolean isDefault) {
        PortfolioLayout layout = new PortfolioLayout();
        layout.caseStudyId = caseStudyId;
        layout.orientation = orientation;
        layout.name = name;
        layout.source = source;
        layout.excludedIdsJson = excludedIdsJson;
        layout.sectionOrderJson = sectionOrderJson;
        layout.sectionGapsJson = sectionGapsJson;
        layout.itemOrderOverridesJson = itemOrderOverridesJson;
        layout.forcedPageOverridesJson = forcedPageOverridesJson;
        layout.contentOverridesJson = contentOverridesJson;
        layout.isDefault = isDefault;
        layout.createdAt = LocalDateTime.now();
        layout.updatedAt = layout.createdAt;
        return layout;
    }

    public void update(
            String name,
            String excludedIdsJson,
            String sectionOrderJson,
            String sectionGapsJson,
            String itemOrderOverridesJson,
            String forcedPageOverridesJson,
            String contentOverridesJson,
            boolean isDefault) {
        this.name = name;
        this.excludedIdsJson = excludedIdsJson;
        this.sectionOrderJson = sectionOrderJson;
        this.sectionGapsJson = sectionGapsJson;
        this.itemOrderOverridesJson = itemOrderOverridesJson;
        this.forcedPageOverridesJson = forcedPageOverridesJson;
        this.contentOverridesJson = contentOverridesJson;
        this.isDefault = isDefault;
        this.updatedAt = LocalDateTime.now();
    }

    public void clearDefault() {
        this.isDefault = false;
        this.updatedAt = LocalDateTime.now();
    }
}
