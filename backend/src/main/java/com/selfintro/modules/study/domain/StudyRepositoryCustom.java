package com.selfintro.modules.study.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface StudyRepositoryCustom {
    Page<Study> search(StudySearchCondition condition, Pageable pageable);
}
