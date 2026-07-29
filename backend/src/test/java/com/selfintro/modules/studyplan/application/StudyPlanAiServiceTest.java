package com.selfintro.modules.studyplan.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.CareerProfileDigestBuilder;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceCategory;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceRelation;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceRelationType;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.learningresource.domain.repository.LearningResourceRepository;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedItem;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedPlan;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedStage;
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

    @Mock private LearningResourceRepository learningResourceRepository;
    @Mock private CareerProfileDigestBuilder careerProfileDigestBuilder;
    @Mock private NvidiaNimClient nvidiaNimClient;

    private StudyPlanAiService service;
    private LearningResourceCategory category;

    @BeforeEach
    void setUp() throws Exception {
        service =
                new StudyPlanAiService(
                        learningResourceRepository,
                        careerProfileDigestBuilder,
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

    @Test
    void throwsBadGatewayWhenAiReturnsUnknownResourceId() {
        LearningResource resource = newResource(1L, "A");
        when(learningResourceRepository.findAll()).thenReturn(List.of(resource));
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn(
                        """
                        {"assistantReply":"ok","stages":[{"stageOrder":1,"theme":"기본기",
                        "items":[{"learningResourceId":999,"freeTextLabel":null,"allocatedMinutes":30,
                        "notes":null,"checkQuestions":[]}]}]}
                        """);

        assertThatThrownBy(() -> service.generateInitial(300, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(
                        e ->
                                assertThat(((ResponseStatusException) e).getStatusCode())
                                        .isEqualTo(HttpStatus.BAD_GATEWAY));
    }

    @Test
    void throwsBadGatewayWhenAiResponseIsNotJson() {
        when(learningResourceRepository.findAll()).thenReturn(List.of());
        when(nvidiaNimClient.generate(anyString(), anyString())).thenReturn("이건 JSON이 아닙니다");

        assertThatThrownBy(() -> service.generateInitial(300, null))
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
        when(learningResourceRepository.findAll()).thenReturn(List.of(before, after));

        // AI mistakenly puts the dependent(after=2) in an earlier stage than its
        // prerequisite(before=1).
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn(
                        """
                        {"assistantReply":"ok","stages":[
                          {"stageOrder":1,"theme":"신기술","items":[{"learningResourceId":2,"freeTextLabel":null,"allocatedMinutes":30,"notes":null,"checkQuestions":[]}]},
                          {"stageOrder":2,"theme":"기본기","items":[{"learningResourceId":1,"freeTextLabel":null,"allocatedMinutes":30,"notes":null,"checkQuestions":[]}]}
                        ]}
                        """);

        GeneratedPlan plan = service.generateInitial(300, null);

        int beforeStageIndex = stageIndexOf(plan, 1L);
        int afterStageIndex = stageIndexOf(plan, 2L);
        assertThat(beforeStageIndex).isLessThan(afterStageIndex);
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
