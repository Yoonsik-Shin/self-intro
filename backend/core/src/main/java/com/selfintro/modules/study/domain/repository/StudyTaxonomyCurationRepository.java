package com.selfintro.modules.study.domain.repository;

import com.selfintro.modules.study.domain.entity.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyTaxonomyCurationRepository
        extends JpaRepository<StudyTaxonomyCuration, Long> {
    List<StudyTaxonomyCuration> findAllByOrderByDisplayOrderAsc();
}
