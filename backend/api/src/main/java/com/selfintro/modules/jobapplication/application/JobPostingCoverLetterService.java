package com.selfintro.modules.jobapplication.application;

import com.selfintro.modules.jobposting.domain.entity.JobPostingCoverLetterItem;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterItemRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterRevisionRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterItemResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterRevisionResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterSaveRequest;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobPostingCoverLetterService {

    private final JobPostingRepository jobPostingRepository;
    private final JobPostingCoverLetterItemRepository coverLetterItemRepository;
    private final JobPostingCoverLetterRevisionRepository revisionRepository;

    public List<JobPostingCoverLetterItemResponse> list(Long jobPostingId) {
        ensurePostingExists(jobPostingId);
        return coverLetterItemRepository
                .findAllByJobPostingIdOrderByDisplayOrderAsc(jobPostingId)
                .stream()
                .map(JobPostingCoverLetterItemResponse::from)
                .toList();
    }

    public List<JobPostingCoverLetterRevisionResponse> getRevisions(Long itemId) {
        return revisionRepository.findByCoverLetterItemIdOrderByIdAsc(itemId).stream()
                .map(JobPostingCoverLetterRevisionResponse::from)
                .toList();
    }

    /** 현재 문항과 답변만 유지하기 위해 기존 목록을 전부 지운 뒤 전달받은 순서대로 다시 저장한다. 빈 목록은 자소서 전체 삭제로 취급한다. */
    @Transactional
    public List<JobPostingCoverLetterItemResponse> replace(
            Long jobPostingId, JobPostingCoverLetterSaveRequest request) {
        ensurePostingExists(jobPostingId);
        coverLetterItemRepository.deleteAllByJobPostingId(jobPostingId);
        coverLetterItemRepository.flush();

        LocalDateTime now = LocalDateTime.now();
        List<JobPostingCoverLetterItem> items =
                java.util.stream.IntStream.range(0, request.items().size())
                        .mapToObj(
                                index -> {
                                    var item = request.items().get(index);
                                    return JobPostingCoverLetterItem.create(
                                            jobPostingId,
                                            item.question().trim(),
                                            item.answer(),
                                            item.characterLimit(),
                                            index,
                                            now);
                                })
                        .toList();

        if (items.isEmpty()) {
            return List.of();
        }
        return coverLetterItemRepository.saveAll(items).stream()
                .map(JobPostingCoverLetterItemResponse::from)
                .toList();
    }

    private void ensurePostingExists(Long jobPostingId) {
        if (!jobPostingRepository.existsById(jobPostingId)) {
            throw new EntityNotFoundException("JobPosting not found: " + jobPostingId);
        }
    }
}
