package com.selfintro.modules.study.domain.repository;

import com.selfintro.modules.study.domain.entity.*;
import com.selfintro.modules.study.domain.enums.StudyStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudyRepository extends JpaRepository<Study, Long>, StudyRepositoryCustom {
    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    Optional<Study> findBySlug(String slug);

    Optional<Study> findByIdAndWorkspaceId(Long id, Long workspaceId);

    @Query("select s.workspaceId as workspaceId, s.id as studyId from Study s")
    List<StudySourceReference> findAllSourceReferences();

    List<Study> findAllByWorkspaceIdOrderByTitleAsc(Long workspaceId);

    List<Study> findAllByExperiences_IdOrderByTitleAsc(Long experienceId);

    @Query(
            "select tn.id as taxonomyNodeId, count(s) as count from Study s "
                    + "join s.taxonomyNodes tn where s.status = :status group by tn.id")
    List<TaxonomyNodeCountProjection> countByTaxonomyNodeAndStatus(
            @Param("status") StudyStatus status);

    interface TaxonomyNodeCountProjection {
        Long getTaxonomyNodeId();

        Long getCount();
    }

    interface StudySourceReference {
        Long getWorkspaceId();

        Long getStudyId();
    }
}
