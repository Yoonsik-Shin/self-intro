package com.selfintro.study.dto;

import com.selfintro.study.entity.StudyCategory;
import com.selfintro.study.entity.StudyEntry;
import java.time.LocalDate;
import java.util.List;

public record StudyEntryResponse(
        Long id,
        String title,
        String description,
        StudyCategory category,
        List<String> skills,
        String takeaway,
        LocalDate learnedAt
) {

    public static StudyEntryResponse from(StudyEntry entry) {
        return new StudyEntryResponse(
                entry.getId(),
                entry.getTitle(),
                entry.getDescription(),
                entry.getCategory(),
                List.copyOf(entry.getSkills()),
                entry.getTakeaway(),
                entry.getLearnedAt()
        );
    }
}
