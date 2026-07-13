package com.selfintro.study.repository;

import com.selfintro.study.entity.StudyCategory;
import com.selfintro.study.entity.StudyEntry;
import java.util.List;

public interface StudyEntryRepositoryCustom {

    List<StudyEntry> search(StudyCategory category);
}
