package com.selfintro.modules.learningresource.domain.repository;

import com.selfintro.modules.learningresource.domain.entity.LearningResourceCategory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningResourceCategoryRepository
        extends JpaRepository<LearningResourceCategory, Long> {
    List<LearningResourceCategory> findAllByOrderByDisplayOrderAsc();
}
