package com.selfintro.modules.studyplan.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceCategory;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.learningresource.domain.repository.LearningResourceRepository;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedCheckQuestion;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedItem;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedPlan;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedStage;
import com.selfintro.modules.studyplan.domain.entity.StudyPlan;
import com.selfintro.modules.studyplan.domain.entity.StudyPlanCheckQuestion;
import com.selfintro.modules.studyplan.domain.entity.StudyPlanItem;
import com.selfintro.modules.studyplan.domain.entity.StudyPlanStage;
import com.selfintro.modules.studyplan.domain.repository.StudyPlanRepository;
import com.selfintro.modules.studyplan.presentation.dto.StudyPlanItemResponse;
import com.selfintro.modules.studyplan.presentation.dto.StudyPlanResponse;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class StudyPlanServiceTest {

    @Mock private StudyPlanRepository studyPlanRepository;
    @Mock private LearningResourceRepository learningResourceRepository;
    @Mock private StudyPlanAiService studyPlanAiService;
    @Mock private StudyPlanRetrievalService studyPlanRetrievalService;

    private StudyPlanService service;
    private LearningResourceCategory category;

    @BeforeEach
    void setUp() throws Exception {
        service =
                new StudyPlanService(
                        studyPlanRepository,
                        learningResourceRepository,
                        studyPlanAiService,
                        studyPlanRetrievalService);
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

    /**
     * create()로 COLLECTING 계획을 만들고 후보를 등록한 뒤, generatePlan()으로 Stage/Item까지 만든다. 이후 테스트에서 findById로
     * 재조회할 수 있도록 저장된 엔티티에 id를 부여하고 mock을 연결한다.
     */
    private StudyPlan createAndRegister(
            List<LearningResource> candidates, GeneratedPlan generated) {
        ArgumentCaptor<StudyPlan> captor = ArgumentCaptor.forClass(StudyPlan.class);
        when(studyPlanRetrievalService.collectInitial("목표")).thenReturn(candidates);
        when(studyPlanRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        service.create(300, "목표");

        StudyPlan saved = captor.getValue();
        ReflectionTestUtils.setField(saved, "id", 1L);
        lenient().when(studyPlanRepository.findById(1L)).thenReturn(Optional.of(saved));

        when(studyPlanAiService.generateInitial(any(), eq(300), eq("목표"))).thenReturn(generated);
        when(learningResourceRepository.findAllById(any())).thenReturn(candidates);
        service.generatePlan(1L);

        // 실제 JPA라면 저장 시 id가 채번되지만, 이 테스트는 repository를 mock했으므로 직접 채번을
        // 흉내낸다 — toggle 계열 테스트가 item id로 조회할 수 있어야 하기 때문.
        long[] sequence = {100L};
        for (StudyPlanStage stage : saved.getStages()) {
            ReflectionTestUtils.setField(stage, "id", sequence[0]++);
            for (StudyPlanItem item : stage.getItems()) {
                ReflectionTestUtils.setField(item, "id", sequence[0]++);
                for (StudyPlanCheckQuestion question : item.getCheckQuestions()) {
                    ReflectionTestUtils.setField(question, "id", sequence[0]++);
                }
            }
        }
        return saved;
    }

    private Long itemIdOf(StudyPlanResponse response, Long resourceId) {
        return response.stages().stream()
                .flatMap(stage -> stage.items().stream())
                .filter(item -> resourceId.equals(item.learningResourceId()))
                .map(StudyPlanItemResponse::id)
                .findFirst()
                .orElseThrow();
    }

    @Test
    void generatePlanBuildsStagesFromAiResponse() {
        LearningResource resource = newResource(10L, "자바 기초");
        GeneratedPlan generated =
                new GeneratedPlan(
                        "요약입니다",
                        List.of(
                                new GeneratedStage(
                                        1,
                                        "기본기 다지기",
                                        List.of(
                                                new GeneratedItem(
                                                        10L,
                                                        null,
                                                        60,
                                                        "메모",
                                                        List.of(
                                                                new GeneratedCheckQuestion(
                                                                        "질문?", "힌트")))))));

        StudyPlan saved = createAndRegister(List.of(resource), generated);
        StudyPlanResponse response = StudyPlanResponse.from(saved);

        assertThat(response.status().name()).isEqualTo("DRAFT");
        assertThat(response.stages()).hasSize(1);
        assertThat(response.stages().get(0).theme()).isEqualTo("기본기 다지기");
        StudyPlanItemResponse item = response.stages().get(0).items().get(0);
        assertThat(item.learningResourceId()).isEqualTo(10L);
        assertThat(item.resourceTitle()).isEqualTo("자바 기초");
        assertThat(item.checkQuestions()).hasSize(1);
        assertThat(item.checkQuestions().get(0).question()).isEqualTo("질문?");
    }

    @Test
    void regeneratePreservesCompletedForRemainingResourceAndDropsForRemovedOne() {
        LearningResource resourceA = newResource(10L, "자바 기초");
        LearningResource resourceB = newResource(20L, "스프링 기초");
        GeneratedPlan initial =
                new GeneratedPlan(
                        "요약",
                        List.of(
                                new GeneratedStage(
                                        1,
                                        "기본기",
                                        List.of(
                                                new GeneratedItem(10L, null, 60, null, List.of()),
                                                new GeneratedItem(
                                                        20L, null, 60, null, List.of())))));
        createAndRegister(List.of(resourceA, resourceB), initial);

        StudyPlanResponse afterGenerate = service.get(1L);
        Long itemAId = itemIdOf(afterGenerate, 10L);
        service.toggleCompleted(1L, itemAId);

        GeneratedPlan regenerated =
                new GeneratedPlan(
                        "다시 짰어요",
                        List.of(
                                new GeneratedStage(
                                        1,
                                        "기본기",
                                        List.of(
                                                new GeneratedItem(
                                                        10L, null, 60, null, List.of())))));
        when(studyPlanAiService.regenerate(any(), eq("스프링은 빼주세요"))).thenReturn(regenerated);
        when(learningResourceRepository.findAllById(any())).thenReturn(List.of(resourceA));

        StudyPlanResponse response = service.sendMessage(1L, "스프링은 빼주세요");

        assertThat(response.stages()).hasSize(1);
        List<StudyPlanItemResponse> items = response.stages().get(0).items();
        assertThat(items).hasSize(1);
        assertThat(items.get(0).learningResourceId()).isEqualTo(10L);
        assertThat(items.get(0).completed()).isTrue();
    }

    @Test
    void sendMessageDuringCollectingAdjustsCandidatesInstead() {
        LearningResource resourceA = newResource(10L, "자바 기초");
        LearningResource resourceB = newResource(20L, "프론트엔드 자료");
        when(studyPlanRetrievalService.collectInitial("목표"))
                .thenReturn(List.of(resourceA, resourceB));
        ArgumentCaptor<StudyPlan> captor = ArgumentCaptor.forClass(StudyPlan.class);
        when(studyPlanRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));
        service.create(300, "목표");
        StudyPlan saved = captor.getValue();
        ReflectionTestUtils.setField(saved, "id", 1L);
        when(studyPlanRepository.findById(1L)).thenReturn(Optional.of(saved));

        when(studyPlanRetrievalService.adjust(List.of(resourceA, resourceB), "프론트엔드는 빼줘"))
                .thenReturn(List.of(resourceA));

        StudyPlanResponse response = service.sendMessage(1L, "프론트엔드는 빼줘");

        assertThat(response.status().name()).isEqualTo("COLLECTING");
        assertThat(response.candidates()).hasSize(1);
        assertThat(response.candidates().get(0).id()).isEqualTo(10L);
        assertThat(response.stages()).isEmpty();
    }

    @Test
    void generatePlanFailsWhenNotCollecting() {
        LearningResource resource = newResource(10L, "자바 기초");
        GeneratedPlan generated =
                new GeneratedPlan(
                        "요약",
                        List.of(
                                new GeneratedStage(
                                        1,
                                        "기본기",
                                        List.of(
                                                new GeneratedItem(
                                                        10L, null, 60, null, List.of())))));
        createAndRegister(List.of(resource), generated);

        assertThatThrownBy(() -> service.generatePlan(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(
                        e ->
                                assertThat(((ResponseStatusException) e).getStatusCode())
                                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void sendMessageThrowsConflictWhenPlanAlreadyConfirmed() {
        GeneratedPlan generated =
                new GeneratedPlan(
                        "요약",
                        List.of(
                                new GeneratedStage(
                                        1,
                                        "기본기",
                                        List.of(
                                                new GeneratedItem(
                                                        null, "복습", 30, null, List.of())))));
        createAndRegister(List.of(newResource(99L, "더미 자료")), generated);
        service.confirm(1L);

        assertThatThrownBy(() -> service.sendMessage(1L, "피드백"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(
                        e ->
                                assertThat(((ResponseStatusException) e).getStatusCode())
                                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void toggleUnderstandingFlipsState() {
        LearningResource resource = newResource(10L, "자바 기초");
        GeneratedPlan generated =
                new GeneratedPlan(
                        "요약",
                        List.of(
                                new GeneratedStage(
                                        1,
                                        "기본기",
                                        List.of(
                                                new GeneratedItem(
                                                        10L, null, 60, null, List.of())))));
        createAndRegister(List.of(resource), generated);
        Long itemId = itemIdOf(service.get(1L), 10L);

        StudyPlanResponse response = service.toggleUnderstanding(1L, itemId);

        StudyPlanItemResponse item = response.stages().get(0).items().get(0);
        assertThat(item.understandingChecked()).isTrue();

        StudyPlanResponse toggledBack = service.toggleUnderstanding(1L, itemId);
        assertThat(toggledBack.stages().get(0).items().get(0).understandingChecked()).isFalse();
    }
}
