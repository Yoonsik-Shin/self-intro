package com.selfintro.modules.jobposting.application;

import com.selfintro.modules.jobposting.domain.entity.JobPostingCoverLetterItem;
import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobApplication;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterItemRepository;
import com.selfintro.modules.jobposting.domain.repository.JobPostingCoverLetterRevisionRepository;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterItemResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterRevisionResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterSaveRequest;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.IntStream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceJobApplicationCoverLetterService {

    private final WorkspaceJobApplicationRepository applicationRepository;
    private final JobPostingCoverLetterItemRepository itemRepository;
    private final JobPostingCoverLetterRevisionRepository revisionRepository;

    public List<JobPostingCoverLetterItemResponse> list(Long workspaceId, Long jobPostingId) {
        WorkspaceJobApplication application = findApplication(workspaceId, jobPostingId);
        return itemRepository
                .findAllByWorkspaceJobApplicationIdOrderByDisplayOrderAsc(application.getId())
                .stream()
                .map(JobPostingCoverLetterItemResponse::from)
                .toList();
    }

    public List<JobPostingCoverLetterRevisionResponse> revisions(
            Long workspaceId, Long jobPostingId, Long itemId) {
        WorkspaceJobApplication application = findApplication(workspaceId, jobPostingId);
        itemRepository
                .findByIdAndWorkspaceJobApplicationId(itemId, application.getId())
                .orElseThrow(() -> new EntityNotFoundException("Cover letter item not found"));
        return revisionRepository.findByCoverLetterItemIdOrderByIdAsc(itemId).stream()
                .map(JobPostingCoverLetterRevisionResponse::from)
                .toList();
    }

    @Transactional
    public List<JobPostingCoverLetterItemResponse> replace(
            Long workspaceId, Long jobPostingId, JobPostingCoverLetterSaveRequest request) {
        WorkspaceJobApplication application = findApplication(workspaceId, jobPostingId);
        itemRepository.deleteAllByWorkspaceJobApplicationId(application.getId());
        itemRepository.flush();

        LocalDateTime now = LocalDateTime.now();
        List<JobPostingCoverLetterItem> items =
                IntStream.range(0, request.items().size())
                        .mapToObj(
                                index -> {
                                    var item = request.items().get(index);
                                    return JobPostingCoverLetterItem.create(
                                            application.getId(),
                                            jobPostingId,
                                            item.question().trim(),
                                            item.answer(),
                                            item.characterLimit(),
                                            index,
                                            now);
                                })
                        .toList();
        return itemRepository.saveAll(items).stream()
                .map(JobPostingCoverLetterItemResponse::from)
                .toList();
    }

    private WorkspaceJobApplication findApplication(Long workspaceId, Long jobPostingId) {
        return applicationRepository
                .findByWorkspaceIdAndJobPostingId(workspaceId, jobPostingId)
                .orElseThrow(
                        () ->
                                new EntityNotFoundException(
                                        "Workspace job application not found: " + jobPostingId));
    }
}
