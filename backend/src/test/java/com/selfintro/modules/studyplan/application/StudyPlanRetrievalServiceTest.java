package com.selfintro.modules.studyplan.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.learningresource.application.LearningResourceService;
import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceCategory;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.learningresource.domain.repository.LearningResourceRepository;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourcePageResponse;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceResponse;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class StudyPlanRetrievalServiceTest {

    @Mock private LearningResourceService learningResourceService;
    @Mock private LearningResourceRepository learningResourceRepository;
    @Mock private NvidiaNimClient nvidiaNimClient;

    private StudyPlanRetrievalService service;
    private LearningResourceCategory category;

    @BeforeEach
    void setUp() throws Exception {
        service =
                new StudyPlanRetrievalService(
                        learningResourceService,
                        learningResourceRepository,
                        nvidiaNimClient,
                        new ObjectMapper());
        var constructor = LearningResourceCategory.class.getDeclaredConstructor();
        constructor.setAccessible(true);
        category = constructor.newInstance();
        ReflectionTestUtils.setField(category, "id", 1L);
        ReflectionTestUtils.setField(category, "name", "백엔드");
        ReflectionTestUtils.setField(category, "slug", "backend");
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
                        category,
                        null,
                        null);
        ReflectionTestUtils.setField(resource, "id", id);
        return resource;
    }

    private LearningResourcePageResponse pageOf(LearningResource... resources) {
        List<LearningResourceResponse> content =
                List.of(resources).stream().map(LearningResourceResponse::from).toList();
        return new LearningResourcePageResponse(content, 0, 40, content.size(), 1);
    }

    @Test
    void collectInitialSearchesByExtractedKeywords() {
        LearningResource resource = newResource(5L, "스프링 부트 강의");
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn("{\"keywords\":[\"스프링\"]}");
        when(learningResourceService.searchAdmin(
                        eq("스프링"), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(),
                        eq(0), anyInt()))
                .thenReturn(pageOf(resource));
        when(learningResourceRepository.findAllById(List.of(5L))).thenReturn(List.of(resource));

        List<LearningResource> result = service.collectInitial("백엔드 심화 학습");

        assertThat(result).containsExactly(resource);
    }

    @Test
    void collectInitialFallsBackToPriorityWhenNoFocusGoal() {
        LearningResource resource = newResource(7L, "P0 우선순위 자료");
        when(learningResourceService.searchAdmin(
                        isNull(),
                        isNull(),
                        isNull(),
                        isNull(),
                        isNull(),
                        isNull(),
                        eq(LearningResourcePriorityTier.P0),
                        eq(0),
                        anyInt()))
                .thenReturn(pageOf(resource));
        when(learningResourceRepository.findAllById(List.of(7L))).thenReturn(List.of(resource));

        List<LearningResource> result = service.collectInitial(null);

        assertThat(result).containsExactly(resource);
        verify(nvidiaNimClient, org.mockito.Mockito.never()).generate(anyString(), anyString());
    }

    @Test
    void adjustRemovesResourceRequestedByFeedback() {
        LearningResource keep = newResource(10L, "자바 기초");
        LearningResource remove = newResource(20L, "프론트엔드 자료");
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn("{\"removeResourceIds\":[20],\"additionalKeywords\":[]}");

        List<LearningResource> result = service.adjust(List.of(keep, remove), "프론트엔드는 빼줘");

        assertThat(result).containsExactly(keep);
    }

    @Test
    void adjustAddsResourcesFoundByAdditionalKeywords() {
        LearningResource current = newResource(10L, "자바 기초");
        LearningResource added = newResource(30L, "책 - 클린 코드");
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn("{\"removeResourceIds\":[],\"additionalKeywords\":[\"클린코드\"]}");
        when(learningResourceService.searchAdmin(
                        eq("클린코드"), any(), any(), any(), any(), any(), any(), eq(0), anyInt()))
                .thenReturn(pageOf(added));
        when(learningResourceRepository.findAllById(List.of(30L))).thenReturn(List.of(added));

        List<LearningResource> result = service.adjust(List.of(current), "책도 넣어줘");

        assertThat(result).containsExactlyInAnyOrder(current, added);
    }
}
