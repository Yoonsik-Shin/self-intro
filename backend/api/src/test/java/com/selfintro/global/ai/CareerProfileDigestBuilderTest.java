package com.selfintro.global.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.selfintro.modules.competency.domain.entity.Competency;
import com.selfintro.modules.competency.domain.repository.CompetencyRepository;
import com.selfintro.modules.experience.domain.entity.Project;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CareerProfileDigestBuilderTest {

    @Mock private ExperienceRepository experienceRepository;
    @Mock private CompetencyRepository competencyRepository;
    @Mock private StudyRepository studyRepository;

    private CareerProfileDigestBuilder builder;

    @BeforeEach
    void setUp() {
        builder =
                new CareerProfileDigestBuilder(
                        experienceRepository, competencyRepository, studyRepository);
    }

    @Test
    void buildsDigestIncludingExperienceCompetencyAndStudy() {
        Project experience =
                Project.create(
                        "프로젝트 A",
                        LocalDate.now(),
                        null,
                        "설명",
                        "배운점",
                        0,
                        List.of(),
                        List.of(),
                        "project-a",
                        "개발자",
                        100);
        Competency competency = Competency.create("백엔드 설계", "요약", 0, true);
        Study study =
                Study.create(
                        "oracle-study",
                        "Oracle 26ai 학습",
                        "Vector DB 및 SQL 공부",
                        "내용",
                        LocalDate.now(),
                        null);

        when(experienceRepository.findAllByOrderByDisplayOrderAsc())
                .thenReturn(List.of(experience));
        when(competencyRepository.findAllByVisibleTrueOrderByDisplayOrderAsc())
                .thenReturn(List.of(competency));
        when(studyRepository.findAll()).thenReturn(List.of(study));

        String digest = builder.build();

        assertThat(digest).contains("프로젝트 A");
        assertThat(digest).contains("핵심역량: 백엔드 설계");
        assertThat(digest).contains("학습/공부: Oracle 26ai 학습");
    }
}
