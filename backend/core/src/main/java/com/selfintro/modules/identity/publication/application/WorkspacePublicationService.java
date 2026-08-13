package com.selfintro.modules.identity.publication.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.bff.application.IntroductionChannel;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceRepository;
import com.selfintro.modules.identity.publication.domain.PublicationOperationType;
import com.selfintro.modules.identity.publication.domain.PublicationResourceType;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicExperienceRevision;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicExperienceRevisionRepository;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicProfileRevision;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicProfileRevisionRepository;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicationResource;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicationResourceRepository;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicationRevision;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicationRevisionRepository;
import com.selfintro.modules.identity.publication.presentation.dto.WorkspacePublicationHistoryResponse;
import com.selfintro.modules.identity.publication.presentation.dto.WorkspacePublicationRevisionResponse;
import com.selfintro.modules.identity.publication.presentation.dto.WorkspacePublicationStatusResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WorkspacePublicationService {
    public static final int CURRENT_SCHEMA_VERSION = 3;
    private static final String ROOT = "root";

    private final WorkspaceRepository workspaceRepository;
    private final WorkspacePublicationRevisionRepository revisionRepository;
    private final WorkspacePublicationResourceRepository resourceRepository;
    private final WorkspacePublicationProjectionBuilder projectionBuilder;
    private final PublicPageCompositionService compositionService;
    private final WorkspacePublicProfileRevisionRepository profileRevisionRepository;
    private final WorkspacePublicExperienceRevisionRepository experienceRevisionRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.publication.retention.max-revisions:20}")
    private int configuredMaximumRetainedRevisions;

    @Value("${app.publication.retention.minimum-age:180d}")
    private Duration configuredMinimumRetentionAge;

    @Transactional(readOnly = true)
    public WorkspacePublicationStatusResponse status(Long workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId).orElseThrow();
        WorkspacePublicationRevision revision =
                revisionRepository
                        .findTopByWorkspaceIdOrderByRevisionNumberDesc(workspaceId)
                        .orElse(null);
        return WorkspacePublicationStatusResponse.from(workspace, revision);
    }

    @Transactional
    public WorkspacePublicationStatusResponse publish(Long workspaceId, Long publishedByUserId) {
        publishLocked(workspaceId, publishedByUserId);
        return status(workspaceId);
    }

    @Transactional(readOnly = true)
    public WorkspacePublicationHistoryResponse history(Long workspaceId) {
        workspaceRepository.findById(workspaceId).orElseThrow();
        List<WorkspacePublicationRevision> revisions =
                revisionRepository.findAllByWorkspaceIdOrderByRevisionNumberDesc(workspaceId);
        int currentRevisionNumber =
                revisions.isEmpty() ? 0 : revisions.getFirst().getRevisionNumber();
        return new WorkspacePublicationHistoryResponse(
                revisions.stream()
                        .map(
                                revision ->
                                        WorkspacePublicationRevisionResponse.from(
                                                revision,
                                                currentRevisionNumber,
                                                CURRENT_SCHEMA_VERSION))
                        .toList(),
                maximumRetainedRevisions(),
                minimumRetentionAge().toDays());
    }

    @Transactional
    public WorkspacePublicationStatusResponse rollback(
            Long workspaceId, int sourceRevisionNumber, Long publishedByUserId) {
        Workspace workspace = workspaceRepository.findByIdForUpdate(workspaceId).orElseThrow();
        WorkspacePublicationRevision source =
                revisionRepository
                        .findByWorkspaceIdAndRevisionNumber(workspaceId, sourceRevisionNumber)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "발행 revision을 찾을 수 없습니다."));
        WorkspacePublicationRevision latest =
                revisionRepository
                        .findTopByWorkspaceIdOrderByRevisionNumberDesc(workspaceId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.CONFLICT, "복원할 발행 이력이 없습니다."));
        if (source.getRevisionNumber() == latest.getRevisionNumber()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 최신 revision입니다.");
        }
        if (source.getSchemaVersion() != CURRENT_SCHEMA_VERSION) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "현재 schema와 호환되지 않는 revision입니다.");
        }
        List<WorkspacePublicationResource> sourceResources =
                resourceRepository.findAllByRevisionIdOrderByIdAsc(source.getId());
        if (sourceResources.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "복원할 공개 snapshot이 비어 있습니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        WorkspacePublicationRevision rollbackRevision =
                createRevision(
                        workspaceId,
                        source.getSchemaVersion(),
                        PublicationOperationType.ROLLBACK,
                        source.getRevisionNumber(),
                        source.getProfileRevisionId(),
                        source.getExperienceRevisionId(),
                        source.getDraftConfigVersion(),
                        publishedByUserId,
                        now);
        resourceRepository.saveAll(
                sourceResources.stream()
                        .map(
                                resource ->
                                        WorkspacePublicationResource.create(
                                                rollbackRevision.getId(),
                                                resource.getResourceType(),
                                                resource.getResourceKey(),
                                                resource.getContentJson()))
                        .toList());
        workspace.publish();
        enforceRetention(workspaceId, now);
        return WorkspacePublicationStatusResponse.from(workspace, rollbackRevision);
    }

    @Transactional
    public void publishSystem(Long workspaceId) {
        publishLocked(workspaceId, null);
    }

    @Transactional
    public WorkspacePublicationStatusResponse unpublish(Long workspaceId) {
        Workspace workspace = workspaceRepository.findByIdForUpdate(workspaceId).orElseThrow();
        workspace.unpublish();
        return WorkspacePublicationStatusResponse.from(
                workspace,
                revisionRepository
                        .findTopByWorkspaceIdOrderByRevisionNumberDesc(workspaceId)
                        .orElse(null));
    }

    private void publishLocked(Long workspaceId, Long publishedByUserId) {
        Workspace workspace = workspaceRepository.findByIdForUpdate(workspaceId).orElseThrow();
        LocalDateTime now = LocalDateTime.now();
        int draftConfigVersion = compositionService.configVersion(workspaceId);
        var profileSnapshot = projectionBuilder.profileSnapshot(workspaceId);
        var experienceSnapshot = projectionBuilder.experienceSnapshot(workspaceId);
        WorkspacePublicProfileRevision profileRevision =
                profileRevisionRepository.saveAndFlush(
                        WorkspacePublicProfileRevision.create(
                                workspaceId,
                                profileRevisionRepository.maxRevisionNumber(workspaceId) + 1,
                                draftConfigVersion,
                                writeJson(profileSnapshot),
                                publishedByUserId,
                                now));
        WorkspacePublicExperienceRevision experienceRevision =
                experienceRevisionRepository.saveAndFlush(
                        WorkspacePublicExperienceRevision.create(
                                workspaceId,
                                experienceRevisionRepository.maxRevisionNumber(workspaceId) + 1,
                                draftConfigVersion,
                                writeJson(experienceSnapshot),
                                publishedByUserId,
                                now));
        WorkspacePublicationRevision revision =
                createRevision(
                        workspaceId,
                        CURRENT_SCHEMA_VERSION,
                        PublicationOperationType.PUBLISH,
                        null,
                        profileRevision.getId(),
                        experienceRevision.getId(),
                        draftConfigVersion,
                        publishedByUserId,
                        now);
        List<WorkspacePublicationResource> resources = new ArrayList<>();
        var webIntroduction = projectionBuilder.introduction(workspaceId, IntroductionChannel.WEB);
        var resumeIntroduction =
                projectionBuilder.introduction(workspaceId, IntroductionChannel.RESUME);
        add(
                resources,
                revision.getId(),
                PublicationResourceType.INTRODUCTION_WEB,
                ROOT,
                webIntroduction);
        add(
                resources,
                revision.getId(),
                PublicationResourceType.INTRODUCTION_RESUME,
                ROOT,
                resumeIntroduction);
        webIntroduction
                .experiences()
                .forEach(
                        experience ->
                                add(
                                        resources,
                                        revision.getId(),
                                        PublicationResourceType.RELATED_EXPERIENCES,
                                        experience.id().toString(),
                                        projectionBuilder.relatedExperiences(
                                                workspaceId, experience.id())));
        projectionBuilder
                .studies(workspaceId)
                .forEach(
                        study ->
                                add(
                                        resources,
                                        revision.getId(),
                                        PublicationResourceType.STUDY,
                                        study.slug(),
                                        study));
        add(
                resources,
                revision.getId(),
                PublicationResourceType.STUDY_TAXONOMY,
                ROOT,
                projectionBuilder.studyTaxonomy(workspaceId));
        add(
                resources,
                revision.getId(),
                PublicationResourceType.STUDY_TAGS,
                ROOT,
                projectionBuilder.studyTags(workspaceId));
        var ontologyIndex = projectionBuilder.ontologyIndex(workspaceId);
        add(
                resources,
                revision.getId(),
                PublicationResourceType.ONTOLOGY_INDEX,
                ROOT,
                ontologyIndex);
        ontologyIndex
                .situations()
                .forEach(
                        situation -> {
                            add(
                                    resources,
                                    revision.getId(),
                                    PublicationResourceType.ONTOLOGY_DETAIL,
                                    situation.stableKey(),
                                    projectionBuilder.ontologyDetail(
                                            workspaceId, situation.stableKey()));
                            add(
                                    resources,
                                    revision.getId(),
                                    PublicationResourceType.ONTOLOGY_STUDIES,
                                    situation.stableKey(),
                                    projectionBuilder.ontologyStudies(
                                            workspaceId, situation.stableKey()));
                        });
        resourceRepository.saveAll(resources);
        workspace.publish();
        compositionService.markPublished(workspaceId);
        enforceRetention(workspaceId, now);
    }

    private WorkspacePublicationRevision createRevision(
            Long workspaceId,
            int schemaVersion,
            PublicationOperationType operationType,
            Integer sourceRevisionNumber,
            Long profileRevisionId,
            Long experienceRevisionId,
            Integer draftConfigVersion,
            Long publishedByUserId,
            LocalDateTime now) {
        int nextRevision = revisionRepository.maxRevisionNumber(workspaceId) + 1;
        return revisionRepository.saveAndFlush(
                WorkspacePublicationRevision.create(
                        workspaceId,
                        nextRevision,
                        schemaVersion,
                        operationType,
                        sourceRevisionNumber,
                        profileRevisionId,
                        experienceRevisionId,
                        draftConfigVersion,
                        publishedByUserId,
                        now));
    }

    private void enforceRetention(Long workspaceId, LocalDateTime now) {
        List<WorkspacePublicationRevision> revisions =
                revisionRepository.findAllByWorkspaceIdOrderByRevisionNumberDesc(workspaceId);
        LocalDateTime cutoff = now.minus(minimumRetentionAge());
        List<Long> expiredRevisionIds =
                expiredRevisions(revisions, maximumRetainedRevisions(), cutoff).stream()
                        .map(WorkspacePublicationRevision::getId)
                        .toList();
        if (expiredRevisionIds.isEmpty()) {
            return;
        }
        resourceRepository.deleteAllByRevisionIds(expiredRevisionIds);
        revisionRepository.deleteAllByIdInBatch(expiredRevisionIds);
    }

    private int maximumRetainedRevisions() {
        return Math.max(1, configuredMaximumRetainedRevisions);
    }

    private Duration minimumRetentionAge() {
        return configuredMinimumRetentionAge.isNegative()
                ? Duration.ZERO
                : configuredMinimumRetentionAge;
    }

    static List<WorkspacePublicationRevision> expiredRevisions(
            List<WorkspacePublicationRevision> revisions,
            int maximumRetainedRevisions,
            LocalDateTime cutoff) {
        return revisions.stream()
                .skip(Math.max(1, maximumRetainedRevisions))
                .filter(revision -> revision.getCreatedAt().isBefore(cutoff))
                .toList();
    }

    private void add(
            List<WorkspacePublicationResource> resources,
            Long revisionId,
            PublicationResourceType type,
            String key,
            Object content) {
        try {
            resources.add(
                    WorkspacePublicationResource.create(
                            revisionId, type, key, objectMapper.writeValueAsString(content)));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Workspace 공개 snapshot 직렬화에 실패했습니다.", exception);
        }
    }

    private String writeJson(Object content) {
        try {
            return objectMapper.writeValueAsString(content);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("공개 카테고리 revision 직렬화에 실패했습니다.", exception);
        }
    }
}
