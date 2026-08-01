package com.selfintro.modules.jobapplication.domain.repository;

import com.selfintro.modules.jobapplication.domain.entity.GapProjectDocument;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GapProjectDocumentRepository extends JpaRepository<GapProjectDocument, Long> {
    List<GapProjectDocument> findAllByJobPostingIdOrderByVersionDesc(Long jobPostingId);

    long countByJobPostingId(Long jobPostingId);
}
