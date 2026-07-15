package com.selfintro.study.repository;

import com.selfintro.study.entity.StudyCategory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyCategoryRepository extends JpaRepository<StudyCategory, Long> {
    List<StudyCategory> findAllByOrderByDisplayOrderAsc();
}
