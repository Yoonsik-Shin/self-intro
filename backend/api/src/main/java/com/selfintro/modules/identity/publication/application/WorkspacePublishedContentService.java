package com.selfintro.modules.identity.publication.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.bff.application.IntroductionChannel;
import com.selfintro.bff.presentation.dto.IntroductionResponse;
import com.selfintro.modules.experience.presentation.dto.RelatedExperienceResponse;
import com.selfintro.modules.experiencetree.domain.enums.DecisionDomain;
import com.selfintro.modules.experiencetree.presentation.dto.ExperienceTreeResponse;
import com.selfintro.modules.identity.publication.domain.PublicationResourceType;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicationResource;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicationResourceRepository;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicationRevision;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicationRevisionRepository;
import com.selfintro.modules.identity.publication.presentation.dto.PublicStudyPreview;
import com.selfintro.modules.study.domain.enums.StudySection;
import com.selfintro.modules.study.presentation.dto.StudyPageResponse;
import com.selfintro.modules.study.presentation.dto.StudyResponse;
import com.selfintro.modules.study.presentation.dto.StudyTaxonomyResponse;
import jakarta.persistence.EntityNotFoundException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspacePublishedContentService {
    private static final String ROOT = "root";

    private final WorkspacePublicationRevisionRepository revisionRepository;
    private final WorkspacePublicationResourceRepository resourceRepository;
    private final ObjectMapper objectMapper;

    public IntroductionResponse introduction(Long workspaceId, IntroductionChannel channel) {
        return introduction(latest(workspaceId), channel);
    }

    /** 발행 이력의 특정 revision이 방문자에게 어떻게 보였는지 읽기 전용으로 다시 렌더링할 때 쓴다. */
    public IntroductionResponse introductionAtRevision(
            Long workspaceId, int revisionNumber, IntroductionChannel channel) {
        return introduction(requireRevision(workspaceId, revisionNumber), channel);
    }

    private IntroductionResponse introduction(
            WorkspacePublicationRevision revision, IntroductionChannel channel) {
        PublicationResourceType type =
                channel == IntroductionChannel.WEB
                        ? PublicationResourceType.INTRODUCTION_WEB
                        : PublicationResourceType.INTRODUCTION_RESUME;
        return read(revision, type, ROOT, IntroductionResponse.class);
    }

    public StudyPageResponse studies(
            Long workspaceId,
            String keyword,
            Long taxonomyNodeId,
            List<String> tags,
            List<Long> skillIds,
            List<Long> experienceIds,
            List<Long> experienceDetailIds,
            StudySection section,
            int page,
            int size) {
        List<StudyResponse> studies =
                readAll(workspaceId, PublicationResourceType.STUDY, StudyResponse.class);
        Set<Long> taxonomyIds =
                taxonomyNodeId == null
                        ? Set.of()
                        : taxonomyIdsWithDescendants(workspaceId, taxonomyNodeId);
        List<StudyResponse> filtered =
                studies.stream()
                        .filter(study -> matchesKeyword(study, keyword))
                        .filter(
                                study ->
                                        taxonomyIds.isEmpty()
                                                || study.taxonomyNodes().stream()
                                                        .anyMatch(
                                                                node ->
                                                                        taxonomyIds.contains(
                                                                                node.id())))
                        .filter(
                                study ->
                                        empty(tags)
                                                || study.tags().stream()
                                                        .anyMatch(tag -> tags.contains(tag.slug())))
                        .filter(
                                study ->
                                        empty(skillIds)
                                                || study.skills().stream()
                                                        .anyMatch(
                                                                skill ->
                                                                        skillIds.contains(
                                                                                skill.id())))
                        .filter(
                                study ->
                                        empty(experienceIds)
                                                || study.experiences().stream()
                                                        .anyMatch(
                                                                experience ->
                                                                        experienceIds.contains(
                                                                                experience.id())))
                        .filter(
                                study ->
                                        empty(experienceDetailIds)
                                                || study.experienceDetails().stream()
                                                        .anyMatch(
                                                                detail ->
                                                                        experienceDetailIds
                                                                                .contains(
                                                                                        detail
                                                                                                .id())))
                        .filter(study -> section == null || study.section() == section)
                        .toList();
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        int from = Math.min(safePage * safeSize, filtered.size());
        int to = Math.min(from + safeSize, filtered.size());
        int totalPages = (filtered.size() + safeSize - 1) / safeSize;
        return new StudyPageResponse(
                filtered.subList(from, to), safePage, safeSize, filtered.size(), totalPages);
    }

    public StudyResponse study(Long workspaceId, String slug) {
        return read(workspaceId, PublicationResourceType.STUDY, slug, StudyResponse.class);
    }

    /** 발행 이력의 특정 revision에 담긴 학습 기록·카테고리를 읽기 전용으로 다시 볼 때 쓴다. */
    public PublicStudyPreview studyPreviewAtRevision(Long workspaceId, int revisionNumber) {
        WorkspacePublicationRevision revision = requireRevision(workspaceId, revisionNumber);
        List<StudyResponse> studies =
                readAll(revision, PublicationResourceType.STUDY, StudyResponse.class);
        List<StudyTaxonomyResponse> taxonomy =
                readList(revision, PublicationResourceType.STUDY_TAXONOMY, ROOT, new TypeReference<>() {});
        return new PublicStudyPreview(studies, taxonomy);
    }

    public List<RelatedExperienceResponse> relatedExperiences(Long workspaceId, Long experienceId) {
        return readList(
                workspaceId,
                PublicationResourceType.RELATED_EXPERIENCES,
                experienceId.toString(),
                new TypeReference<>() {});
    }

    public List<StudyTaxonomyResponse> studyTaxonomy(Long workspaceId) {
        return readList(
                workspaceId,
                PublicationResourceType.STUDY_TAXONOMY,
                ROOT,
                new TypeReference<>() {});
    }

    public List<StudyResponse.TagResponse> studyTags(Long workspaceId) {
        return readList(
                workspaceId, PublicationResourceType.STUDY_TAGS, ROOT, new TypeReference<>() {});
    }

    public ExperienceTreeResponse.Index ontologyIndex(
            Long workspaceId, DecisionDomain domain, String query) {
        ExperienceTreeResponse.Index snapshot =
                read(
                        workspaceId,
                        PublicationResourceType.ONTOLOGY_INDEX,
                        ROOT,
                        ExperienceTreeResponse.Index.class);
        String normalized =
                StringUtils.hasText(query) ? query.trim().toLowerCase(Locale.ROOT) : null;
        List<ExperienceTreeResponse.SituationSummary> situations =
                snapshot.situations().stream()
                        .filter(value -> domain == null || value.domain() == domain)
                        .filter(
                                value ->
                                        normalized == null
                                                || contains(value.title(), normalized)
                                                || contains(value.summary(), normalized)
                                                || contains(value.topic(), normalized))
                        .toList();
        Set<String> keys =
                situations.stream()
                        .map(ExperienceTreeResponse.SituationSummary::stableKey)
                        .collect(Collectors.toSet());
        return new ExperienceTreeResponse.Index(
                snapshot.version(),
                situations,
                snapshot.relations().stream()
                        .filter(
                                relation ->
                                        keys.contains(relation.sourceKey())
                                                && keys.contains(relation.targetKey()))
                        .toList());
    }

    public ExperienceTreeResponse.Detail ontologyDetail(Long workspaceId, String stableKey) {
        return read(
                workspaceId,
                PublicationResourceType.ONTOLOGY_DETAIL,
                stableKey,
                ExperienceTreeResponse.Detail.class);
    }

    public List<ExperienceTreeResponse.StudyLink> ontologyStudies(
            Long workspaceId, String stableKey) {
        return readList(
                workspaceId,
                PublicationResourceType.ONTOLOGY_STUDIES,
                stableKey,
                new TypeReference<>() {});
    }

    private Set<Long> taxonomyIdsWithDescendants(Long workspaceId, Long requestedId) {
        List<StudyTaxonomyResponse> taxonomy = studyTaxonomy(workspaceId);
        Set<Long> result = new HashSet<>();
        List<Long> queue = new ArrayList<>(List.of(requestedId));
        while (!queue.isEmpty()) {
            Long current = queue.remove(queue.size() - 1);
            if (!result.add(current)) continue;
            taxonomy.stream()
                    .filter(node -> current.equals(node.parentId()))
                    .map(StudyTaxonomyResponse::id)
                    .forEach(queue::add);
        }
        return result;
    }

    private boolean matchesKeyword(StudyResponse study, String keyword) {
        if (!StringUtils.hasText(keyword)) return true;
        String normalized = keyword.trim().toLowerCase(Locale.ROOT);
        return contains(study.title(), normalized)
                || contains(study.summary(), normalized)
                || contains(study.contentMarkdown(), normalized)
                || study.tags().stream().anyMatch(tag -> contains(tag.name(), normalized))
                || study.skills().stream().anyMatch(skill -> contains(skill.name(), normalized))
                || study.experiences().stream()
                        .anyMatch(experience -> contains(experience.title(), normalized));
    }

    private boolean contains(String value, String normalized) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(normalized);
    }

    private boolean empty(List<?> values) {
        return values == null || values.isEmpty();
    }

    private WorkspacePublicationRevision latest(Long workspaceId) {
        return revisionRepository
                .findTopByWorkspaceIdOrderByRevisionNumberDesc(workspaceId)
                .orElseThrow(() -> new EntityNotFoundException("발행된 Workspace revision이 없습니다."));
    }

    private WorkspacePublicationRevision requireRevision(Long workspaceId, int revisionNumber) {
        return revisionRepository
                .findByWorkspaceIdAndRevisionNumber(workspaceId, revisionNumber)
                .orElseThrow(
                        () ->
                                new EntityNotFoundException(
                                        "해당 revision을 찾을 수 없습니다: v" + revisionNumber));
    }

    private <T> T read(
            Long workspaceId, PublicationResourceType type, String key, Class<T> responseType) {
        return read(latest(workspaceId), type, key, responseType);
    }

    private <T> T read(
            WorkspacePublicationRevision revision,
            PublicationResourceType type,
            String key,
            Class<T> responseType) {
        WorkspacePublicationResource resource =
                resourceRepository
                        .findByRevisionIdAndResourceTypeAndResourceKey(revision.getId(), type, key)
                        .orElseThrow(() -> new EntityNotFoundException("공개 resource를 찾을 수 없습니다."));
        try {
            return objectMapper.readValue(resource.getContentJson(), responseType);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("공개 snapshot 역직렬화에 실패했습니다.", exception);
        }
    }

    private <T> List<T> readAll(
            Long workspaceId, PublicationResourceType type, Class<T> responseType) {
        return readAll(latest(workspaceId), type, responseType);
    }

    private <T> List<T> readAll(
            WorkspacePublicationRevision revision,
            PublicationResourceType type,
            Class<T> responseType) {
        return resourceRepository
                .findAllByRevisionIdAndResourceTypeOrderByIdAsc(revision.getId(), type)
                .stream()
                .map(resource -> deserialize(resource, responseType))
                .toList();
    }

    private <T> List<T> readList(
            Long workspaceId,
            PublicationResourceType type,
            String key,
            TypeReference<List<T>> responseType) {
        return readList(latest(workspaceId), type, key, responseType);
    }

    private <T> List<T> readList(
            WorkspacePublicationRevision revision,
            PublicationResourceType type,
            String key,
            TypeReference<List<T>> responseType) {
        WorkspacePublicationResource resource =
                resourceRepository
                        .findByRevisionIdAndResourceTypeAndResourceKey(revision.getId(), type, key)
                        .orElseThrow(() -> new EntityNotFoundException("공개 resource를 찾을 수 없습니다."));
        try {
            return objectMapper.readValue(resource.getContentJson(), responseType);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("공개 snapshot 역직렬화에 실패했습니다.", exception);
        }
    }

    private <T> T deserialize(WorkspacePublicationResource resource, Class<T> responseType) {
        try {
            return objectMapper.readValue(resource.getContentJson(), responseType);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("공개 snapshot 역직렬화에 실패했습니다.", exception);
        }
    }
}
