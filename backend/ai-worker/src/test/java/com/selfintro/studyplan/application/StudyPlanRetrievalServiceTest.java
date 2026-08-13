package com.selfintro.studyplan.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.entity.WorkspaceLearningResource;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.learningresource.domain.repository.WorkspaceLearningResourceRepository;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.entity.WorkspaceSkill;
import com.selfintro.modules.skill.domain.repository.WorkspaceSkillRepository;
import com.selfintro.modules.taxonomy.domain.entity.TaxonomyNode;
import com.selfintro.studyplan.application.StudyPlanRetrievalService.CollectedCandidate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class StudyPlanRetrievalServiceTest {

    private static final Long WORKSPACE_ID = 9L;

    @Mock private WorkspaceLearningResourceRepository workspaceLearningResourceRepository;
    @Mock private WorkspaceSkillRepository workspaceSkillRepository;
    @Mock private NvidiaNimClient nvidiaNimClient;

    private StudyPlanRetrievalService service;
    private TaxonomyNode taxonomyNode;

    @BeforeEach
    void setUp() throws Exception {
        service =
                new StudyPlanRetrievalService(
                        workspaceLearningResourceRepository,
                        workspaceSkillRepository,
                        nvidiaNimClient,
                        new ObjectMapper());
        var constructor = TaxonomyNode.class.getDeclaredConstructor();
        constructor.setAccessible(true);
        taxonomyNode = constructor.newInstance();
        ReflectionTestUtils.setField(taxonomyNode, "id", 1L);
        ReflectionTestUtils.setField(taxonomyNode, "name", "백엔드");
        ReflectionTestUtils.setField(taxonomyNode, "slug", "backend");
        Skill skill = Skill.create("스프링", "백엔드", "ADVANCED", true, 0);
        WorkspaceSkill workspaceSkill =
                WorkspaceSkill.create(
                        WORKSPACE_ID, skill, "ADVANCED", null, null, "LEARNING", true, 0);
        when(workspaceSkillRepository.findAllByWorkspaceIdOrderByDisplayOrderAsc(WORKSPACE_ID))
                .thenReturn(List.of(workspaceSkill));
    }

    private LearningResource newResource(long id, String title) {
        LearningResource resource =
                LearningResource.create(
                        "slug-" + id,
                        title,
                        LearningResourceType.ONLINE_COURSE,
                        "인프런",
                        null,
                        null,
                        60,
                        LearningResourceStatus.WISHLIST,
                        LearningResourcePriorityTier.P1,
                        0,
                        null,
                        null);
        resource.replaceTaxonomyNodes(List.of(taxonomyNode));
        ReflectionTestUtils.setField(resource, "id", id);
        return resource;
    }

    private WorkspaceLearningResource overlayOf(LearningResource resource) {
        return WorkspaceLearningResource.create(
                WORKSPACE_ID,
                resource,
                LearningResourceStatus.WISHLIST,
                LearningResourcePriorityTier.P1,
                0,
                null,
                null);
    }

    private List<LearningResource> resourcesOf(List<CollectedCandidate> collected) {
        return collected.stream().map(CollectedCandidate::resource).toList();
    }

    @Test
    void collectInitialSearchesByExtractedKeywords() {
        LearningResource resource = newResource(5L, "스프링 부트 강의");
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn("{\"keywords\":[\"스프링\"]}");
        when(workspaceLearningResourceRepository.findAllByWorkspaceIdOrderByDisplayOrderAscIdDesc(
                        WORKSPACE_ID))
                .thenReturn(List.of(overlayOf(resource)));

        List<CollectedCandidate> result = service.collectInitial(WORKSPACE_ID, "백엔드 심화 학습");

        assertThat(resourcesOf(result)).containsExactly(resource);
        assertThat(result.get(0).familiar()).isTrue();
    }

    @Test
    void collectInitialFallsBackToBroadPoolWhenNoFocusGoal() {
        LearningResource resource = newResource(7L, "아무 자료");
        when(workspaceLearningResourceRepository.findAllByWorkspaceIdOrderByDisplayOrderAscIdDesc(
                        WORKSPACE_ID))
                .thenReturn(List.of(overlayOf(resource)));

        List<CollectedCandidate> result = service.collectInitial(WORKSPACE_ID, null);

        assertThat(resourcesOf(result)).containsExactly(resource);
        verify(nvidiaNimClient, org.mockito.Mockito.never()).generate(anyString(), anyString());
    }

    @Test
    void adjustRemovesResourceRequestedByFeedback() {
        LearningResource keep = newResource(10L, "자바 기초");
        LearningResource remove = newResource(20L, "프론트엔드 자료");
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn("{\"removeResourceIds\":[20],\"additionalKeywords\":[]}");

        List<CollectedCandidate> result =
                service.adjust(WORKSPACE_ID, List.of(keep, remove), "프론트엔드는 빼줘");

        assertThat(resourcesOf(result)).containsExactly(keep);
    }

    @Test
    void adjustAddsResourcesFoundByAdditionalKeywords() {
        LearningResource current = newResource(10L, "자바 기초");
        LearningResource added = newResource(30L, "책 - 클린 코드");
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn("{\"removeResourceIds\":[],\"additionalKeywords\":[\"클린 코드\"]}");
        when(workspaceLearningResourceRepository.findAllByWorkspaceIdOrderByDisplayOrderAscIdDesc(
                        WORKSPACE_ID))
                .thenReturn(List.of(overlayOf(added)));

        List<CollectedCandidate> result = service.adjust(WORKSPACE_ID, List.of(current), "책도 넣어줘");

        assertThat(resourcesOf(result)).containsExactlyInAnyOrder(current, added);
    }
}
