package com.selfintro.study.service;

import com.selfintro.study.dto.CreateStudyEntryRequest;
import com.selfintro.study.dto.StudyEntryResponse;
import com.selfintro.study.entity.StudyCategory;
import com.selfintro.study.entity.StudyEntry;
import com.selfintro.study.repository.StudyEntryRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyEntryService {

    private final StudyEntryRepository studyEntryRepository;

    public List<StudyEntryResponse> findAll(StudyCategory category) {
        return studyEntryRepository.search(category).stream()
                .map(StudyEntryResponse::from)
                .toList();
    }

    @Transactional
    public StudyEntryResponse create(CreateStudyEntryRequest request) {
        StudyEntry entry = StudyEntry.create(
                request.title(),
                request.description(),
                request.category(),
                request.skills(),
                request.takeaway(),
                request.learnedAt()
        );

        return StudyEntryResponse.from(studyEntryRepository.save(entry));
    }

    @Transactional
    public StudyEntryResponse update(Long id, CreateStudyEntryRequest request) {
        StudyEntry entry = studyEntryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("StudyEntry not found: " + id));

        entry.update(
                request.title(),
                request.description(),
                request.category(),
                request.skills(),
                request.takeaway(),
                request.learnedAt()
        );

        return StudyEntryResponse.from(entry);
    }

    @Transactional
    public void delete(Long id) {
        if (!studyEntryRepository.existsById(id)) {
            throw new EntityNotFoundException("StudyEntry not found: " + id);
        }
        studyEntryRepository.deleteById(id);
    }
}
