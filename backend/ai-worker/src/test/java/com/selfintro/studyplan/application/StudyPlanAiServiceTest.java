package com.selfintro.studyplan.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.CareerProfileDigestBuilder;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceRelation;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceRelationType;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.studyplan.application.StudyPlanAiService.GeneratedItem;
import com.selfintro.studyplan.application.StudyPlanAiService.GeneratedPlan;
import com.selfintro.studyplan.application.StudyPlanAiService.GeneratedStage;
import com.selfintro.modules.taxonomy.domain.entity.TaxonomyNode;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class StudyPlanAiServiceTest {

    @Mock private CareerProfileDigestBuilder careerProfileDigestBuilder;
    @Mock private NvidiaNimClient nvidiaNimClient;

    private StudyPlanAiService service;
    private TaxonomyNode taxonomyNode;

    @BeforeEach
    void setUp() throws Exception {
        service =
                new StudyPlanAiService(
                        careerProfileDigestBuilder, nvidiaNimClient, new ObjectMapper());
        var constructor = TaxonomyNode.class.getDeclaredConstructor();
        constructor.setAccessible(true);
        taxonomyNode = constructor.newInstance();
        ReflectionTestUtils.setField(taxonomyNode, "id", 1L);
        ReflectionTestUtils.setField(taxonomyNode, "name", "백엔드");
        ReflectionTestUtils.setField(taxonomyNode, "slug", "backend");
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

    @Test
    void throwsBadGatewayWhenAiReturnsUnknownResourceId() {
        LearningResource resource = newResource(1L, "A");
        when(nvidiaNimClient.generate(anyString(), anyString(), anyInt()))
                .thenReturn(
                        """
                        {"assistantReply":"ok","stages":[{"stageOrder":1,"theme":"기본기",
                        "items":[{"learningResourceId":999,"freeTextLabel":null,"allocatedMinutes":30,
                        "notes":null,"checkQuestions":[]}]}]}
                        """);

        assertThatThrownBy(() -> service.generateInitial(List.of(resource), 300, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(
                        e ->
                                assertThat(((ResponseStatusException) e).getStatusCode())
                                        .isEqualTo(HttpStatus.BAD_GATEWAY));
    }

    @Test
    void throwsBadGatewayWhenAiResponseIsNotJson() {
        when(nvidiaNimClient.generate(anyString(), anyString(), anyInt()))
                .thenReturn("이건 JSON이 아닙니다");

        assertThatThrownBy(() -> service.generateInitial(List.of(), 300, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(
                        e ->
                                assertThat(((ResponseStatusException) e).getStatusCode())
                                        .isEqualTo(HttpStatus.BAD_GATEWAY));
    }

    @Test
    void correctsStageOrderWhenAiViolatesPrerequisite() {
        LearningResource before = newResource(1L, "선행 자료");
        LearningResource after = newResource(2L, "후행 자료");
        // relation은 "source" 쪽에 저장된다; source=선행, target=후행으로 선행 -> 후행을 표현한다.
        before.replaceRelations(
                List.of(
                        LearningResourceRelation.create(
                                before, after, LearningResourceRelationType.PREREQUISITE, 0)));

        // AI mistakenly puts the dependent(after=2) in an earlier stage than its
        // prerequisite(before=1).
        when(nvidiaNimClient.generate(anyString(), anyString(), anyInt()))
                .thenReturn(
                        """
                        {"assistantReply":"ok","stages":[
                          {"stageOrder":1,"theme":"신기술","items":[{"learningResourceId":2,"freeTextLabel":null,"allocatedMinutes":30,"notes":null,"checkQuestions":[]}]},
                          {"stageOrder":2,"theme":"기본기","items":[{"learningResourceId":1,"freeTextLabel":null,"allocatedMinutes":30,"notes":null,"checkQuestions":[]}]}
                        ]}
                        """);

        GeneratedPlan plan = service.generateInitial(List.of(before, after), 300, null);

        int beforeStageIndex = stageIndexOf(plan, 1L);
        int afterStageIndex = stageIndexOf(plan, 2L);
        assertThat(beforeStageIndex).isLessThan(afterStageIndex);
    }

    @Test
    void keepsDistinctThemesAtSameLevelAsSeparateParallelStages() {
        LearningResource a = newResource(1L, "CS 기초 자료");
        LearningResource b = newResource(2L, "데이터베이스 자료");
        // 둘 사이엔 선후관계가 없다 — 같은 레벨에 서로 다른 테마로 나와도 하나로 합쳐지면 안 된다.
        when(nvidiaNimClient.generate(anyString(), anyString(), anyInt()))
                .thenReturn(
                        """
                        {"assistantReply":"ok","stages":[
                          {"stageOrder":1,"theme":"CS 기초","items":[{"learningResourceId":1,"freeTextLabel":null,"allocatedMinutes":30,"notes":null,"checkQuestions":[]}]},
                          {"stageOrder":1,"theme":"데이터베이스","items":[{"learningResourceId":2,"freeTextLabel":null,"allocatedMinutes":30,"notes":null,"checkQuestions":[]}]}
                        ]}
                        """);

        GeneratedPlan plan = service.generateInitial(List.of(a, b), 300, null);

        assertThat(plan.stages()).hasSize(2);
        assertThat(plan.stages()).allSatisfy(stage -> assertThat(stage.stageOrder()).isEqualTo(1));
        assertThat(plan.stages().stream().map(GeneratedStage::theme))
                .containsExactlyInAnyOrder("CS 기초", "데이터베이스");
    }

    private int stageIndexOf(GeneratedPlan plan, Long resourceId) {
        List<GeneratedStage> stages = plan.stages();
        for (int i = 0; i < stages.size(); i++) {
            for (GeneratedItem item : stages.get(i).items()) {
                if (resourceId.equals(item.learningResourceId())) {
                    return i;
                }
            }
        }
        throw new AssertionError("resource not found in any stage: " + resourceId);
    }
}
