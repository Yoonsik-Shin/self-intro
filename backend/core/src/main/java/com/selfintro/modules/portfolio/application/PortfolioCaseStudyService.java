package com.selfintro.modules.portfolio.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final PortfolioCaseStudyMarkdownRenderer markdownRenderer;
    private final ObjectMapper objectMapper;

    public List<PortfolioCaseStudyResponse> list() {
        return caseStudyRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(PortfolioCaseStudyResponse::from)
                .toList();
    }

    public PortfolioCaseStudyDetailResponse get(Long id) {
        PortfolioCaseStudy caseStudy = findOrThrow(id);
        List<PortfolioCaseStudyRevisionResponse> revisions =
                revisionRepository.findAllByCaseStudyIdOrderByVersionDesc(id).stream()
                        .map(this::toRevisionResponse)
                        .toList();
        return new PortfolioCaseStudyDetailResponse(PortfolioCaseStudyResponse.from(caseStudy), revisions);
    }

    @Transactional
    public PortfolioCaseStudyResponse create(PortfolioCaseStudyCreateRequest request) {
        if (!experienceRepository.existsById(request.experienceId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 프로젝트입니다.");
        }
        if (caseStudyRepository.existsBySlug(request.slug())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 slug입니다.");
        }
        PortfolioCaseStudy caseStudy =
                PortfolioCaseStudy.create(request.experienceId(), request.slug(), request.title());
        return PortfolioCaseStudyResponse.from(caseStudyRepository.save(caseStudy));
    }

    @Transactional
    public PortfolioCaseStudyResponse rename(Long id, String slug, String title) {
        PortfolioCaseStudy caseStudy = findOrThrow(id);
        if (!caseStudy.getSlug().equals(slug) && caseStudyRepository.existsBySlugAndIdNot(slug, id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 slug입니다.");
        }
        caseStudy.rename(slug, title);
        return PortfolioCaseStudyResponse.from(caseStudy);
    }

    @Transactional
    public void delete(Long id) {
        if (!caseStudyRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 케이스스터디입니다.");
        }
        caseStudyRepository.deleteById(id);
    }

    @Transactional
    public PortfolioCaseStudyRevisionResponse saveRevision(
            Long caseStudyId, PortfolioCaseStudyContent content, String source) {
        PortfolioCaseStudy caseStudy = findOrThrow(caseStudyId);
        int nextVersion = (int) revisionRepository.countByCaseStudyId(caseStudyId) + 1;
        String contentJson = writeJson(content);
        String renderedMarkdown = markdownRenderer.render(caseStudy.getTitle(), content);
        PortfolioCaseStudyRevision revision =
                PortfolioCaseStudyRevision.create(
                        caseStudyId, nextVersion, source, contentJson, renderedMarkdown);
        return toRevisionResponse(revisionRepository.save(revision));
    }

    @Transactional
    public PortfolioCaseStudyResponse publish(Long caseStudyId, Long revisionId) {
        PortfolioCaseStudy caseStudy = findOrThrow(caseStudyId);
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
    public PortfolioCaseStudyResponse unpublish(Long caseStudyId) {
        PortfolioCaseStudy caseStudy = findOrThrow(caseStudyId);
        caseStudy.backToDraft();
        return PortfolioCaseStudyResponse.from(caseStudy);
    }

    public List<PortfolioCaseStudyPublicSummaryResponse> listPublished() {
        return caseStudyRepository
                .findAllByStatusOrderByUpdatedAtDesc(PortfolioCaseStudy.STATUS_PUBLISHED)
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
                            return new PortfolioCaseStudyPublicSummaryResponse(
                                    caseStudy.getId(),
                                    caseStudy.getSlug(),
                                    caseStudy.getTitle(),
                                    content.summary(),
                                    caseStudy.getUpdatedAt());
                        })
                .toList();
    }

    public PortfolioCaseStudyPublicResponse getPublishedBySlug(String slug) {
        PortfolioCaseStudy caseStudy =
                caseStudyRepository
                        .findBySlugAndStatus(slug, PortfolioCaseStudy.STATUS_PUBLISHED)
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
                                                HttpStatus.INTERNAL_SERVER_ERROR, "발행된 리비전을 찾지 못했습니다."));
        return new PortfolioCaseStudyPublicResponse(
                caseStudy.getId(),
                caseStudy.getSlug(),
                caseStudy.getTitle(),
                caseStudy.getExperienceId(),
                readContent(revision),
                revision.getRenderedMarkdown(),
                caseStudy.getUpdatedAt());
    }

    private PortfolioCaseStudy findOrThrow(Long id) {
        return caseStudyRepository
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 케이스스터디입니다."));
    }

    private PortfolioCaseStudyRevisionResponse toRevisionResponse(PortfolioCaseStudyRevision revision) {
        return new PortfolioCaseStudyRevisionResponse(
                revision.getId(),
                revision.getCaseStudyId(),
                revision.getVersion(),
                revision.getSource(),
                readContent(revision),
                revision.getRenderedMarkdown(),
                revision.getCreatedAt());
    }

    private PortfolioCaseStudyContent readContent(PortfolioCaseStudyRevision revision) {
        try {
            return objectMapper.readValue(revision.getContentJson(), PortfolioCaseStudyContent.class);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "저장된 케이스스터디 본문을 읽지 못했습니다.", exception);
        }
    }

    private String writeJson(PortfolioCaseStudyContent content) {
        try {
            return objectMapper.writeValueAsString(content);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("케이스스터디 본문 직렬화에 실패했습니다.", exception);
        }
    }
}
