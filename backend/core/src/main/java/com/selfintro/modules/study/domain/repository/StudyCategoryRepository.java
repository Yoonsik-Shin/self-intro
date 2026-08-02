package com.selfintro.modules.study.domain.repository;

import com.selfintro.modules.study.domain.entity.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyCategoryRepository extends JpaRepository<StudyCategory, Long> {
    List<StudyCategory> findAllByOrderByDisplayOrderAsc();
}
