package com.selfintro.study.repository;

import com.selfintro.study.entity.Study;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface StudyRepositoryCustom {
    Page<Study> search(StudySearchCondition condition, Pageable pageable);
}
