package com.selfintro.modules.taxonomy.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "taxonomy_scheme")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TaxonomyScheme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type", nullable = false, length = 20)
    private TaxonomySchemeScope scopeType;

    @Column(name = "scope_key", nullable = false, length = 80)
    private String scopeKey;

    @Column(name = "workspace_id")
    private Long workspaceId;

    @Column(name = "family_key", nullable = false, length = 80)
    private String familyKey;

    @Column(nullable = false)
    private int version;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaxonomySchemeStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static TaxonomyScheme createPlatform(
            String familyKey, int version, String name, String description) {
        TaxonomyScheme scheme = new TaxonomyScheme();
        scheme.scopeType = TaxonomySchemeScope.PLATFORM;
        scheme.scopeKey = "PLATFORM";
        scheme.familyKey = familyKey;
        scheme.version = version;
        scheme.name = name;
        scheme.description = description;
        scheme.status = TaxonomySchemeStatus.ACTIVE;
        scheme.createdAt = LocalDateTime.now();
        scheme.updatedAt = scheme.createdAt;
        return scheme;
    }

    public boolean isActivePlatformScheme() {
        return scopeType == TaxonomySchemeScope.PLATFORM && status == TaxonomySchemeStatus.ACTIVE;
    }
}
