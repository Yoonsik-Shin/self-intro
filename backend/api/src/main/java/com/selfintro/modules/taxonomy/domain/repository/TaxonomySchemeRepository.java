package com.selfintro.modules.taxonomy.domain.repository;

import com.selfintro.modules.taxonomy.domain.entity.TaxonomyScheme;
import com.selfintro.modules.taxonomy.domain.entity.TaxonomySchemeScope;
import com.selfintro.modules.taxonomy.domain.entity.TaxonomySchemeStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaxonomySchemeRepository extends JpaRepository<TaxonomyScheme, Long> {
    Optional<TaxonomyScheme> findByScopeTypeAndFamilyKeyAndVersion(
            TaxonomySchemeScope scopeType, String familyKey, int version);

    List<TaxonomyScheme> findAllByScopeTypeAndStatusOrderByFamilyKeyAscVersionDesc(
            TaxonomySchemeScope scopeType, TaxonomySchemeStatus status);
}
