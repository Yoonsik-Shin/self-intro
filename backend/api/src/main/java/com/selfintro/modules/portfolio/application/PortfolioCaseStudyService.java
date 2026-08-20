package com.selfintro.modules.portfolio.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.experience.domain.repository.ExperienceDetailRepository;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudy;
import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudyRevision;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRepository;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRevisionRepository;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyContent;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyCreateRequest;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyDetailResponse;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyPublicResponse;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyPublicSummaryResponse;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyResponse;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyRevisionResponse;
import com.selfintro.modules.storage.application.StorageService;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioCaseStudyService {

    private final PortfolioCaseStudyRepository caseStudyRepository;
    private final PortfolioCaseStudyRevisionRepository revisionRepository;
    private final ExperienceRepository experienceRepository;
    private final ExperienceDetailRepository experienceDetailRepository;
    private final StudyRepository studyRepository;
    private final PortfolioCaseStudyMarkdownRenderer markdownRenderer;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;

    public List<PortfolioCaseStudyResponse> list(Long workspaceId) {
        return caseStudyRepository.findAllByWorkspaceIdOrderByUpdatedAtDesc(workspaceId).stream()
                .map(PortfolioCaseStudyResponse::from)
                .toList();
    }

    public PortfolioCaseStudyDetailResponse get(Long workspaceId, Long id) {
        PortfolioCaseStudy caseStudy = findOrThrow(workspaceId, id);
        List<PortfolioCaseStudyRevisionResponse> revisions =
                revisionRepository.findAllByCaseStudyIdOrderByVersionDesc(id).stream()
                        .map(this::toRevisionResponse)
                        .toList();
        return new PortfolioCaseStudyDetailResponse(
                PortfolioCaseStudyResponse.from(caseStudy), revisions);
    }

    @Transactional
    public PortfolioCaseStudyResponse create(
            Long workspaceId, PortfolioCaseStudyCreateRequest request) {
        if (experienceRepository
                .findByIdAndWorkspaceId(request.experienceId(), workspaceId)
                .isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 프로젝트입니다.");
        }
        if (caseStudyRepository.existsByWorkspaceIdAndSlug(workspaceId, request.slug())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 slug입니다.");
        }
        PortfolioCaseStudy caseStudy =
                PortfolioCaseStudy.create(
                        workspaceId, request.experienceId(), request.slug(), request.title());
        return PortfolioCaseStudyResponse.from(caseStudyRepository.save(caseStudy));
    }

    @Transactional
    public PortfolioCaseStudyResponse rename(Long workspaceId, Long id, String slug, String title) {
        PortfolioCaseStudy caseStudy = findOrThrow(workspaceId, id);
        if (!caseStudy.getSlug().equals(slug)
                && caseStudyRepository.existsByWorkspaceIdAndSlugAndIdNot(workspaceId, slug, id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 slug입니다.");
        }
        caseStudy.rename(slug, title);
        return PortfolioCaseStudyResponse.from(caseStudy);
    }

    @Transactional
    public void delete(Long workspaceId, Long id) {
        caseStudyRepository.delete(findOrThrow(workspaceId, id));
    }

    @Transactional
    public PortfolioCaseStudyRevisionResponse saveRevision(
            Long workspaceId, Long caseStudyId, PortfolioCaseStudyContent content, String source) {
        return saveRevision(workspaceId, caseStudyId, content, source, null, null, null);
    }

    @Transactional
    public PortfolioCaseStudyRevisionResponse saveRevision(
            Long workspaceId,
            Long caseStudyId,
            PortfolioCaseStudyContent content,
            String source,
            Long baseRevisionId,
            String feedbackInstruction,
            String aiModel) {
        PortfolioCaseStudy caseStudy = findOrThrow(workspaceId, caseStudyId);
        validateContentReferences(workspaceId, caseStudy, content);
        validateRevisionMetadata(caseStudyId, source, baseRevisionId, feedbackInstruction, aiModel);
        int nextVersion = (int) revisionRepository.countByCaseStudyId(caseStudyId) + 1;
        String contentJson = writeJson(content);
        String renderedMarkdown = markdownRenderer.render(caseStudy.getTitle(), content);
        PortfolioCaseStudyRevision revision =
                PortfolioCaseStudyRevision.create(
                        caseStudyId,
                        nextVersion,
                        source,
                        contentJson,
                        renderedMarkdown,
                        baseRevisionId,
                        normalizeOptional(feedbackInstruction),
                        normalizeOptional(aiModel));
        return toRevisionResponse(revisionRepository.save(revision));
    }

    private void validateRevisionMetadata(
            Long caseStudyId,
            String source,
            Long baseRevisionId,
            String feedbackInstruction,
            String aiModel) {
        if (!PortfolioCaseStudyRevision.SOURCE_AI.equals(source)
                && !PortfolioCaseStudyRevision.SOURCE_MANUAL.equals(source)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "지원하지 않는 revision source입니다.");
        }
        if (baseRevisionId != null
                && revisionRepository
                        .findById(baseRevisionId)
                        .filter(revision -> revision.getCaseStudyId().equals(caseStudyId))
                        .isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "다른 케이스스터디의 revision은 기준본으로 사용할 수 없습니다.");
        }
        if (PortfolioCaseStudyRevision.SOURCE_MANUAL.equals(source)
                && (normalizeOptional(feedbackInstruction) != null
                        || normalizeOptional(aiModel) != null)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "수동 revision에는 AI 대화 metadata를 기록할 수 없습니다.");
        }
        if (baseRevisionId != null && normalizeOptional(feedbackInstruction) == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "기준 revision을 사용한 AI 수정에는 피드백 요청이 필요합니다.");
        }
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    @Transactional
    public PortfolioCaseStudyResponse publish(Long workspaceId, Long caseStudyId, Long revisionId) {
        PortfolioCaseStudy caseStudy = findOrThrow(workspaceId, caseStudyId);
        PortfolioCaseStudyRevision revision =
                revisionRepository
                        .findById(revisionId)
                        .filter(item -> item.getCaseStudyId().equals(caseStudyId))
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "존재하지 않는 리비전입니다."));
        caseStudy.publish(revision.getId());
        return PortfolioCaseStudyResponse.from(caseStudy);
    }

    @Transactional
    public PortfolioCaseStudyResponse unpublish(Long workspaceId, Long caseStudyId) {
        PortfolioCaseStudy caseStudy = findOrThrow(workspaceId, caseStudyId);
        caseStudy.backToDraft();
        return PortfolioCaseStudyResponse.from(caseStudy);
    }

    public List<PortfolioCaseStudyPublicSummaryResponse> listPublished(Long workspaceId) {
        return publishedWithContent(workspaceId).stream()
                .map(
                        entry ->
                                new PortfolioCaseStudyPublicSummaryResponse(
                                        entry.caseStudy().getId(),
                                        entry.caseStudy().getSlug(),
                                        entry.caseStudy().getTitle(),
                                        entry.content().summary(),
                                        entry.caseStudy().getUpdatedAt()))
                .toList();
    }

    /** 특정 Study를 근거로 인용한 발행된 케이스스터디 목록 — Study 상세 페이지의 역참조 표시용. */
    public List<PortfolioCaseStudyPublicSummaryResponse> listPublishedByStudyId(
            Long workspaceId, Long studyId) {
        return publishedWithContent(workspaceId).stream()
                .filter(entry -> entry.content().sourceStudyIds().contains(studyId))
                .map(
                        entry ->
                                new PortfolioCaseStudyPublicSummaryResponse(
                                        entry.caseStudy().getId(),
                                        entry.caseStudy().getSlug(),
                                        entry.caseStudy().getTitle(),
                                        entry.content().summary(),
                                        entry.caseStudy().getUpdatedAt()))
                .toList();
    }

    private record PublishedEntry(
            PortfolioCaseStudy caseStudy, PortfolioCaseStudyContent content) {}

    private List<PublishedEntry> publishedWithContent(Long workspaceId) {
        return caseStudyRepository
                .findAllByWorkspaceIdAndStatusOrderByUpdatedAtDesc(
                        workspaceId, PortfolioCaseStudy.STATUS_PUBLISHED)
                .stream()
                .filter(caseStudy -> caseStudy.getPublishedRevisionId() != null)
                .map(
                        caseStudy -> {
                            PortfolioCaseStudyContent content =
                                    readContent(
                                            revisionRepository
                                                    .findById(caseStudy.getPublishedRevisionId())
                                                    .orElseThrow(
                                                            () ->
                                                                    new ResponseStatusException(
                                                                            HttpStatus
                                                                                    .INTERNAL_SERVER_ERROR,
                                                                            "발행된 리비전을 찾지 못했습니다.")));
                            return new PublishedEntry(caseStudy, content);
                        })
                .toList();
    }

    public PortfolioCaseStudyPublicResponse getPublishedBySlug(Long workspaceId, String slug) {
        PortfolioCaseStudy caseStudy =
                caseStudyRepository
                        .findByWorkspaceIdAndSlugAndStatus(
                                workspaceId, slug, PortfolioCaseStudy.STATUS_PUBLISHED)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "존재하지 않는 포트폴리오입니다."));
        if (caseStudy.getPublishedRevisionId() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 포트폴리오입니다.");
        }
        PortfolioCaseStudyRevision revision =
                revisionRepository
                        .findById(caseStudy.getPublishedRevisionId())
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.INTERNAL_SERVER_ERROR,
                                                "발행된 리비전을 찾지 못했습니다."));
        return new PortfolioCaseStudyPublicResponse(
                caseStudy.getId(),
                caseStudy.getSlug(),
                caseStudy.getTitle(),
                caseStudy.getExperienceId(),
                readContent(revision),
                revision.getRenderedMarkdown(),
                caseStudy.getUpdatedAt());
    }

    public PortfolioCaseStudy findOrThrow(Long workspaceId, Long id) {
        return caseStudyRepository
                .findByIdAndWorkspaceId(id, workspaceId)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "존재하지 않는 케이스스터디입니다."));
    }

    private void validateContentReferences(
            Long workspaceId, PortfolioCaseStudy caseStudy, PortfolioCaseStudyContent content) {
        List<Long> studyIds =
                content.sourceStudyIds() == null ? List.of() : content.sourceStudyIds();
        if (studyIds.stream()
                .anyMatch(
                        id -> studyRepository.findByIdAndWorkspaceId(id, workspaceId).isEmpty())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "다른 Workspace의 Study는 참조할 수 없습니다.");
        }
        List<Long> detailIds =
                content.sourceExperienceDetailIds() == null
                        ? List.of()
                        : content.sourceExperienceDetailIds();
        if (detailIds.stream()
                .anyMatch(
                        id ->
                                experienceDetailRepository
                                        .findByIdAndExperience_WorkspaceId(id, workspaceId)
                                        .filter(
                                                detail ->
                                                        detail.getExperience()
                                                                .getId()
                                                                .equals(
                                                                        caseStudy
                                                                                .getExperienceId()))
                                        .isEmpty())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "케이스스터디 프로젝트에 속하지 않은 상세 근거입니다.");
        }
        if (content.architecture() != null && content.architecture().imageObjectKeys() != null) {
            content.architecture()
                    .imageObjectKeys()
                    .forEach(key -> storageService.requireOwnedObjectKey(workspaceId, key));
        }
    }

    private PortfolioCaseStudyRevisionResponse toRevisionResponse(
            PortfolioCaseStudyRevision revision) {
        return new PortfolioCaseStudyRevisionResponse(
                revision.getId(),
                revision.getCaseStudyId(),
                revision.getVersion(),
                revision.getSource(),
                readContent(revision),
                revision.getRenderedMarkdown(),
                revision.getBaseRevisionId(),
                revision.getFeedbackInstruction(),
                revision.getAiModel(),
                revision.getCreatedAt());
    }

    private PortfolioCaseStudyContent readContent(PortfolioCaseStudyRevision revision) {
        PortfolioCaseStudyContent content;
        try {
            content =
                    objectMapper.readValue(
                            revision.getContentJson(), PortfolioCaseStudyContent.class);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "저장된 케이스스터디 본문을 읽지 못했습니다.", exception);
        }
        return withResolvedImageUrls(content);
    }

    /**
     * content_json에는 objectKey만 저장되어 있으므로 응답을 만들 때만 공개 URL로 해석해 채우고, 스키마 확장 전에 저장된 리비전(구버전
     * content_json)에 없는 필드는 null 대신 빈 값으로 채워 프론트가 null 체크 없이 바로 .map() 등을 쓸 수 있게 한다.
     */
    private PortfolioCaseStudyContent withResolvedImageUrls(PortfolioCaseStudyContent content) {
        List<String> imageObjectKeys =
                content.architecture() == null || content.architecture().imageObjectKeys() == null
                        ? List.of()
                        : content.architecture().imageObjectKeys();
        List<String> imageUrls = imageObjectKeys.stream().map(storageService::toPublicUrl).toList();
        PortfolioCaseStudyContent.Architecture resolved =
                new PortfolioCaseStudyContent.Architecture(
                        content.architecture() == null
                                ? null
                                : content.architecture().mermaidSource(),
                        imageObjectKeys,
                        imageUrls);
        PortfolioCaseStudyContent.Outcome outcome =
                content.outcome() == null
                        ? new PortfolioCaseStudyContent.Outcome("", List.of())
                        : new PortfolioCaseStudyContent.Outcome(
                                content.outcome().summary(),
                                content.outcome().metrics() == null
                                        ? List.of()
                                        : content.outcome().metrics());
        return new PortfolioCaseStudyContent(
                content.summary(),
                content.problem(),
                content.thoughtProcess(),
                content.tradeoffs() == null ? List.of() : content.tradeoffs(),
                content.solution(),
                outcome,
                resolved,
                content.sourceStudyIds() == null ? List.of() : content.sourceStudyIds(),
                content.sourceExperienceDetailIds() == null
                        ? List.of()
                        : content.sourceExperienceDetailIds());
    }

    private String writeJson(PortfolioCaseStudyContent content) {
        try {
            return objectMapper.writeValueAsString(content);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("케이스스터디 본문 직렬화에 실패했습니다.", exception);
        }
    }
}
