package com.selfintro.modules.learningresource.domain.repository;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface LearningResourceRepositoryCustom {
    Page<LearningResource> search(LearningResourceSearchCondition condition, Pageable pageable);
}
