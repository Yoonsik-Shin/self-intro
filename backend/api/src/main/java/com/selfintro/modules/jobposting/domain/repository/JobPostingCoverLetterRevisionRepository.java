package com.selfintro.modules.jobposting.domain.repository;

import com.selfintro.modules.jobposting.domain.entity.JobPostingCoverLetterRevision;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobPostingCoverLetterRevisionRepository
        extends JpaRepository<JobPostingCoverLetterRevision, Long> {

    List<JobPostingCoverLetterRevision> findByCoverLetterItemIdOrderByIdAsc(Long coverLetterItemId);
}
