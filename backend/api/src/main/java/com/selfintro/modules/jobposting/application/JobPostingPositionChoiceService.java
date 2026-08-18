package com.selfintro.modules.jobposting.application;

import com.selfintro.modules.jobposting.domain.entity.JobPostingPositionChoice;
import com.selfintro.modules.jobposting.domain.repository.JobPostingPositionChoiceRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingPositionChoiceSaveRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 한 공고에 2지망 이상을 등록/수정한다. URL·이미지 자동수집이 감지한 나머지 모집부문을 사람이 확정할 때, 그리고 수동 등록/수정 폼에서 "+지망 추가"로 직접 입력할 때
 * 양쪽에서 재사용한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobPostingPositionChoiceService {

    private final JobPostingRepository jobPostingRepository;
    private final JobPostingPositionChoiceRepository positionChoiceRepository;

    /** 현재 지망 목록만 유지하기 위해 기존 목록을 전부 지운 뒤 전달받은 순서대로 다시 저장한다. 빈 목록은 2지망 이하 전체 삭제로 취급한다. */
    @Transactional
    public List<JobPostingResponse.PositionChoice> replace(
            Long jobPostingId, JobPostingPositionChoiceSaveRequest request) {
        if (jobPostingRepository.findByIdAndOwnerWorkspaceIdIsNull(jobPostingId).isEmpty()) {
            throw new EntityNotFoundException("JobPosting not found: " + jobPostingId);
        }
        positionChoiceRepository.deleteByJobPostingId(jobPostingId);
        positionChoiceRepository.flush();

        if (request.choices().isEmpty()) {
            return List.of();
        }

        LocalDateTime now = LocalDateTime.now();
        List<JobPostingPositionChoice> choices =
                request.choices().stream()
                        .map(
                                item ->
                                        JobPostingPositionChoice.of(
                                                jobPostingId,
                                                item.rank(),
                                                item.positionTitle().trim(),
                                                now))
                        .toList();
        return positionChoiceRepository.saveAll(choices).stream()
                .map(JobPostingResponse.PositionChoice::from)
                .toList();
    }
}
