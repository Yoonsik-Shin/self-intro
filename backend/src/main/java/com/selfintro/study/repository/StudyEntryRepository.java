package com.selfintro.study.repository;

import com.selfintro.study.entity.StudyEntry;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyEntryRepository extends JpaRepository<StudyEntry, Long>, StudyEntryRepositoryCustom {
}
