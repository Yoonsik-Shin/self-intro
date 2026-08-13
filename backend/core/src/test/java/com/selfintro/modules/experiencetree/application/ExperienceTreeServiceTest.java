package com.selfintro.modules.experiencetree.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.selfintro.modules.experiencetree.domain.entity.DecisionSituation;
import com.selfintro.modules.experiencetree.domain.enums.DecisionStudyRelationType;
import com.selfintro.modules.experiencetree.domain.enums.VerificationStatus;
import com.selfintro.modules.experiencetree.domain.repository.DecisionOptionRepository;
import com.selfintro.modules.experiencetree.domain.repository.DecisionSituationRelationRepository;
import com.selfintro.modules.experiencetree.domain.repository.DecisionSituationRepository;
import com.selfintro.modules.experiencetree.domain.repository.DecisionSourceRepository;
import com.selfintro.modules.experiencetree.domain.repository.DecisionStudyLinkRepository;
import com.selfintro.modules.experiencetree.domain.repository.DecisionTradeoffRepository;
import com.selfintro.modules.experiencetree.domain.repository.DecisionWarningRepository;
import com.selfintro.modules.experiencetree.presentation.dto.DecisionStudyLinkRequest;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ExperienceTreeServiceTest {

    @Mock private DecisionSituationRepository situationRepository;
    @Mock private DecisionOptionRepository optionRepository;
    @Mock private DecisionTradeoffRepository tradeoffRepository;
    @Mock private DecisionWarningRepository warningRepository;
    @Mock private DecisionSourceRepository sourceRepository;
    @Mock private DecisionStudyLinkRepository studyLinkRepository;
    @Mock private DecisionSituationRelationRepository relationRepository;
    @Mock private StudyRepository studyRepository;
    @InjectMocks private ExperienceTreeService service;

    private DecisionSituation verifiedSituation() {
        DecisionSituation situation = DecisionSituation.create("architecture:event-driven");
        ReflectionTestUtils.setField(situation, "id", 31L);
        ReflectionTestUtils.setField(situation, "verificationStatus", VerificationStatus.VERIFIED);
        return situation;
    }

    @Test
    void rejectsAStudyFromAnotherWorkspaceBeforeSavingTheLink() {
        DecisionSituation situation = verifiedSituation();
        when(situationRepository.findByStableKey(situation.getStableKey()))
                .thenReturn(Optional.of(situation));
        when(studyRepository.findByIdAndWorkspaceId(91L, 22L)).thenReturn(Optional.empty());
        DecisionStudyLinkRequest request =
                new DecisionStudyLinkRequest(
                        situation.getStableKey(),
                        null,
                        91L,
                        DecisionStudyRelationType.APPLIED,
                        "적용 근거",
                        0);

        assertThatThrownBy(() -> service.createLink(22L, request))
                .isInstanceOf(EntityNotFoundException.class);
        verifyNoInteractions(studyLinkRepository);
    }

    @Test
    void cannotUpdateALinkThroughAnotherWorkspace() {
        when(studyLinkRepository.findByIdAndWorkspaceId(7L, 22L)).thenReturn(Optional.empty());
        DecisionStudyLinkRequest request =
                new DecisionStudyLinkRequest(
                        "architecture:event-driven",
                        null,
                        91L,
                        DecisionStudyRelationType.APPLIED,
                        null,
                        0);

        assertThatThrownBy(() -> service.updateLink(22L, 7L, request))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void readsLinksOnlyFromTheRequestedWorkspace() {
        DecisionSituation situation = verifiedSituation();
        when(situationRepository.findByStableKey(situation.getStableKey()))
                .thenReturn(Optional.of(situation));
        when(studyLinkRepository.findAllByWorkspaceIdAndSituationIdOrderByDisplayOrderAsc(22L, 31L))
                .thenReturn(List.of());

        assertThat(service.studies(22L, situation.getStableKey(), false)).isEmpty();
        verify(studyLinkRepository)
                .findAllByWorkspaceIdAndSituationIdOrderByDisplayOrderAsc(22L, 31L);
    }
}
