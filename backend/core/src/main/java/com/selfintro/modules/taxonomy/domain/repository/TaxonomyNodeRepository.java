package com.selfintro.modules.taxonomy.domain.repository;

import com.selfintro.modules.taxonomy.domain.entity.TaxonomyNode;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaxonomyNodeRepository extends JpaRepository<TaxonomyNode, Long> {
    List<TaxonomyNode> findAllByOrderByDisplayOrderAsc();

    boolean existsByParentId(Long parentId);

    @Query(
            value =
                    "select exists(select 1 from study_taxonomy_node where taxonomy_node_id = :id)",
            nativeQuery = true)
    boolean existsInStudyAttachments(@Param("id") Long id);

    @Query(
            value =
                    "select exists(select 1 from learning_resource_taxonomy_node where taxonomy_node_id = :id)",
            nativeQuery = true)
    boolean existsInLearningResourceAttachments(@Param("id") Long id);
}
