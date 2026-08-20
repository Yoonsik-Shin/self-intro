package com.selfintro.modules.study.domain.repository;

import com.selfintro.modules.study.domain.entity.*;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudyRepository extends JpaRepository<Study, Long>, StudyRepositoryCustom {
    boolean existsByWorkspaceIdAndSlug(Long workspaceId, String slug);

    boolean existsByWorkspaceIdAndSlugAndIdNot(Long workspaceId, String slug, Long id);

    long countByWorkspaceId(Long workspaceId);

    Optional<Study> findBySlug(String slug);

    Optional<Study> findByWorkspaceIdAndSlug(Long workspaceId, String slug);

    Optional<Study> findByIdAndWorkspaceId(Long id, Long workspaceId);

    @Query("select s.workspaceId as workspaceId, s.id as studyId from Study s")
    List<StudySourceReference> findAllSourceReferences();

    List<Study> findAllByWorkspaceIdAndIdIn(Long workspaceId, Collection<Long> ids);

    List<Study> findAllByWorkspaceIdOrderByTitleAsc(Long workspaceId);

    boolean existsByWorkspaceIdAndSkills_Id(Long workspaceId, Long skillId);

    List<Study> findAllByExperiences_IdOrderByTitleAsc(Long experienceId);

    @Query(
            "select tn.id as taxonomyNodeId, count(s) as count from Study s "
                    + "join s.taxonomyNodes tn where s.workspaceId = :workspaceId "
                    + "group by tn.id")
    List<TaxonomyNodeCountProjection> countByTaxonomyNode(@Param("workspaceId") Long workspaceId);

    interface TaxonomyNodeCountProjection {
        Long getTaxonomyNodeId();

        Long getCount();
    }

    interface StudySourceReference {
        Long getWorkspaceId();

        Long getStudyId();
    }
}
