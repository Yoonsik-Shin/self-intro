package com.selfintro.modules.identity.publication.application;

import com.selfintro.bff.application.IntroductionChannel;
import com.selfintro.bff.presentation.dto.IntroductionResponse;
import com.selfintro.modules.competency.application.CompetencyService;
import com.selfintro.modules.experience.application.ExperienceConnectionService;
import com.selfintro.modules.experience.application.ExperiencePlacementService;
import com.selfintro.modules.experience.application.ExperienceService;
import com.selfintro.modules.experience.domain.enums.ExperiencePlacementType;
import com.selfintro.modules.experience.presentation.dto.ExperienceResponse;
import com.selfintro.modules.experience.presentation.dto.RelatedExperienceResponse;
import com.selfintro.modules.experiencetree.application.ExperienceTreeService;
import com.selfintro.modules.experiencetree.presentation.dto.ExperienceTreeResponse;
import com.selfintro.modules.identity.publication.presentation.dto.PublicExperienceDraft;
import com.selfintro.modules.identity.publication.presentation.dto.PublicExperienceSnapshot;
import com.selfintro.modules.identity.publication.presentation.dto.PublicProfileDraft;
import com.selfintro.modules.identity.publication.presentation.dto.PublicProfileSnapshot;
import com.selfintro.modules.identity.publication.presentation.dto.PublicStudyDraft;
import com.selfintro.modules.portfolio.application.PortfolioCaseStudyService;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyPublicSummaryResponse;
import com.selfintro.modules.profile.application.ProfileService;
import com.selfintro.modules.profile.presentation.dto.ProfileResponse;
import com.selfintro.modules.skill.application.SkillService;
import com.selfintro.modules.skill.domain.entity.WorkspaceSkill;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import com.selfintro.modules.study.application.StudyService;
import com.selfintro.modules.study.presentation.dto.StudyResponse;
import com.selfintro.modules.study.presentation.dto.StudyTaxonomyResponse;
import com.selfintro.modules.taxonomy.domain.entity.TaxonomyNode;
import com.selfintro.modules.taxonomy.domain.repository.TaxonomyNodeRepository;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspacePublicationProjectionBuilder {
    private final ProfileService profileService;
    private final ExperienceService experienceService;
    private final ExperienceConnectionService experienceConnectionService;
    private final ExperiencePlacementService experiencePlacementService;
    private final SkillService skillService;
    private final StudyService studyService;
    private final CompetencyService competencyService;
    private final ExperienceTreeService experienceTreeService;
    private final PortfolioCaseStudyService portfolioCaseStudyService;
    private final TaxonomyNodeRepository taxonomyNodeRepository;
    private final PublicPageCompositionService compositionService;

    public IntroductionResponse introduction(Long workspaceId, IntroductionChannel channel) {
        PublicProfileSnapshot profile = profileSnapshot(workspaceId);
        PublicExperienceSnapshot experience = experienceSnapshot(workspaceId);
        return new IntroductionResponse(
                profile.profile(),
                experience.experiences(),
                experience.coreProjects(),
                profile.skills(),
                calculateCareerSummary(experience.experiences()),
                profile.competencies());
    }

    public PublicProfileSnapshot profileSnapshot(Long workspaceId) {
        if (!compositionService.available()) {
            return legacyProfileSnapshot(workspaceId);
        }
        PublicProfileDraft draft = compositionService.profile(workspaceId);
        ProfileResponse profile =
                profileService
                        .getProfile(workspaceId)
                        .map(ProfileResponse::from)
                        .map(
                                value ->
                                        value.forPublication(
                                                draft.showName(),
                                                draft.showNameEn(),
                                                draft.showJobTitle(),
                                                draft.showBio(),
                                                draft.showCoreStackSummary(),
                                                draft.showStatusBadge(),
                                                draft.showGithub(),
                                                draft.showEmail(),
                                                draft.showPhone()))
                        .orElse(null);

        Map<Long, WorkspaceSkill> workspaceSkills =
                skillService.getWorkspaceSkills(workspaceId).stream()
                        .collect(Collectors.toMap(WorkspaceSkill::getId, Function.identity()));
        List<SkillResponse> skills =
                draft.skills().stream()
                        .filter(PublicProfileDraft.ItemSelection::enabled)
                        .sorted(
                                Comparator.comparingInt(
                                        PublicProfileDraft.ItemSelection::displayOrder))
                        .map(PublicProfileDraft.ItemSelection::id)
                        .map(workspaceSkills::get)
                        .filter(Objects::nonNull)
                        .map(SkillResponse::from)
                        .toList();
        List<Long> competencyIds =
                draft.competencies().stream()
                        .filter(PublicProfileDraft.ItemSelection::enabled)
                        .sorted(
                                Comparator.comparingInt(
                                        PublicProfileDraft.ItemSelection::displayOrder))
                        .map(PublicProfileDraft.ItemSelection::id)
                        .toList();
        return new PublicProfileSnapshot(
                profile, skills, competencyService.getForPublication(workspaceId, competencyIds));
    }

    public PublicExperienceSnapshot experienceSnapshot(Long workspaceId) {
        if (!compositionService.available()) {
            return legacyExperienceSnapshot(workspaceId);
        }
        PublicExperienceDraft draft = compositionService.experience(workspaceId);
        Map<Long, ExperienceResponse> source =
                experienceService.getAllExperiences(workspaceId).stream()
                        .map(experienceService::toResponse)
                        .collect(Collectors.toMap(ExperienceResponse::id, Function.identity()));
        Map<Long, List<Long>> detailIds =
                draft.details().stream()
                        .filter(PublicExperienceDraft.DetailSelection::enabled)
                        .sorted(
                                Comparator.comparingInt(
                                        PublicExperienceDraft.DetailSelection::displayOrder))
                        .collect(
                                Collectors.groupingBy(
                                        PublicExperienceDraft.DetailSelection::experienceId,
                                        LinkedHashMap::new,
                                        Collectors.mapping(
                                                PublicExperienceDraft.DetailSelection::id,
                                                Collectors.toList())));
        List<PublicExperienceDraft.ExperienceSelection> selected =
                draft.experiences().stream()
                        .filter(PublicExperienceDraft.ExperienceSelection::enabled)
                        .sorted(
                                Comparator.comparingInt(
                                        PublicExperienceDraft.ExperienceSelection::displayOrder))
                        .toList();
        List<ExperienceResponse> experiences =
                selected.stream()
                        .map(
                                item -> {
                                    ExperienceResponse response = source.get(item.id());
                                    return response == null
                                            ? null
                                            : response.withPublicationSettings(
                                                    detailIds.getOrDefault(item.id(), List.of()),
                                                    item.displayOrder(),
                                                    item.showOnTimeline(),
                                                    item.timelineLabel());
                                })
                        .filter(Objects::nonNull)
                        .toList();
        Map<Long, ExperienceResponse> selectedById =
                experiences.stream()
                        .collect(Collectors.toMap(ExperienceResponse::id, Function.identity()));
        List<ExperienceResponse> coreProjects =
                draft.placements().stream()
                        .filter(PublicExperienceDraft.PlacementSelection::enabled)
                        .filter(item -> "CORE_PROJECT".equals(item.placementType()))
                        .sorted(
                                Comparator.comparingInt(
                                        PublicExperienceDraft.PlacementSelection::displayOrder))
                        .map(PublicExperienceDraft.PlacementSelection::experienceId)
                        .map(selectedById::get)
                        .filter(Objects::nonNull)
                        .toList();
        Map<Long, PortfolioCaseStudyPublicSummaryResponse> publishedPortfolios =
                portfolioCaseStudyService.listPublished(workspaceId).stream()
                        .collect(
                                Collectors.toMap(
                                        PortfolioCaseStudyPublicSummaryResponse::id,
                                        Function.identity()));
        List<PortfolioCaseStudyPublicSummaryResponse> portfolios =
                draft.portfolios().stream()
                        .filter(PublicExperienceDraft.PortfolioSelection::enabled)
                        .sorted(
                                Comparator.comparingInt(
                                        PublicExperienceDraft.PortfolioSelection::displayOrder))
                        .map(PublicExperienceDraft.PortfolioSelection::id)
                        .map(publishedPortfolios::get)
                        .filter(Objects::nonNull)
                        .toList();
        return new PublicExperienceSnapshot(experiences, coreProjects, portfolios);
    }

    public List<StudyResponse> studies(Long workspaceId) {
        if (!compositionService.available()) {
            return studyService.getPublishedForPublication(workspaceId);
        }
        PublicStudyDraft draft = compositionService.study(workspaceId);
        List<Long> studyIds =
                draft.studies().stream()
                        .filter(PublicStudyDraft.StudySelection::enabled)
                        .sorted(
                                Comparator.comparingInt(
                                        PublicStudyDraft.StudySelection::displayOrder))
                        .map(PublicStudyDraft.StudySelection::id)
                        .toList();
        Set<Long> taxonomyIds =
                draft.taxonomy().stream()
                        .filter(PublicStudyDraft.TaxonomySelection::enabled)
                        .map(PublicStudyDraft.TaxonomySelection::id)
                        .collect(Collectors.toSet());
        return studyService.getForPublication(workspaceId, studyIds, taxonomyIds);
    }

    public List<RelatedExperienceResponse> relatedExperiences(Long workspaceId, Long experienceId) {
        if (!compositionService.available()) {
            return experienceConnectionService.getRelatedExperiences(workspaceId, experienceId);
        }
        Set<Long> selectedIds =
                compositionService.experience(workspaceId).experiences().stream()
                        .filter(PublicExperienceDraft.ExperienceSelection::enabled)
                        .map(PublicExperienceDraft.ExperienceSelection::id)
                        .collect(Collectors.toSet());
        return experienceConnectionService.getRelatedExperiences(workspaceId, experienceId).stream()
                .filter(item -> selectedIds.contains(item.id()))
                .toList();
    }

    public List<StudyTaxonomyResponse> studyTaxonomy(Long workspaceId) {
        if (!compositionService.available()) {
            return studyService.findPublicTaxonomy(workspaceId);
        }
        PublicStudyDraft draft = compositionService.study(workspaceId);
        Map<Long, Long> counts =
                studies(workspaceId).stream()
                        .flatMap(study -> study.taxonomyNodes().stream())
                        .collect(Collectors.groupingBy(node -> node.id(), Collectors.counting()));
        Map<Long, TaxonomyNode> nodes =
                taxonomyNodeRepository
                        .findAllById(
                                draft.taxonomy().stream()
                                        .filter(PublicStudyDraft.TaxonomySelection::enabled)
                                        .map(PublicStudyDraft.TaxonomySelection::id)
                                        .toList())
                        .stream()
                        .collect(Collectors.toMap(TaxonomyNode::getId, Function.identity()));
        return draft.taxonomy().stream()
                .filter(PublicStudyDraft.TaxonomySelection::enabled)
                .sorted(Comparator.comparingInt(PublicStudyDraft.TaxonomySelection::displayOrder))
                .map(
                        selection -> {
                            TaxonomyNode node = nodes.get(selection.id());
                            if (node == null) return null;
                            String label =
                                    selection.displayLabel() == null
                                                    || selection.displayLabel().isBlank()
                                            ? node.getName()
                                            : selection.displayLabel();
                            return new StudyTaxonomyResponse(
                                    node.getId(),
                                    label,
                                    node.getSlug(),
                                    selection.displayOrder(),
                                    node.getParent() == null ? null : node.getParent().getId(),
                                    counts.getOrDefault(node.getId(), 0L));
                        })
                .filter(Objects::nonNull)
                .toList();
    }

    public List<StudyResponse.TagResponse> studyTags(Long workspaceId) {
        if (!compositionService.available()) {
            return studyService.findTags(workspaceId);
        }
        return studies(workspaceId).stream()
                .flatMap(study -> study.tags().stream())
                .collect(
                        Collectors.collectingAndThen(
                                Collectors.toMap(
                                        StudyResponse.TagResponse::id,
                                        Function.identity(),
                                        (left, right) -> left,
                                        LinkedHashMap::new),
                                map -> List.copyOf(map.values())));
    }

    public ExperienceTreeResponse.Index ontologyIndex(Long workspaceId) {
        return experienceTreeService.index(workspaceId, null, null);
    }

    public ExperienceTreeResponse.Detail ontologyDetail(Long workspaceId, String stableKey) {
        return experienceTreeService.detail(workspaceId, stableKey);
    }

    public List<ExperienceTreeResponse.StudyLink> ontologyStudies(
            Long workspaceId, String stableKey) {
        return experienceTreeService.studies(workspaceId, stableKey, false);
    }

    private PublicProfileSnapshot legacyProfileSnapshot(Long workspaceId) {
        ProfileResponse profile =
                profileService
                        .getProfile(workspaceId)
                        .map(ProfileResponse::fromPublic)
                        .orElse(null);
        List<SkillResponse> skills =
                skillService.getWorkspaceSkills(workspaceId).stream()
                        .map(SkillResponse::from)
                        .toList();
        return new PublicProfileSnapshot(
                profile, skills, competencyService.getVisible(workspaceId));
    }

    private PublicExperienceSnapshot legacyExperienceSnapshot(Long workspaceId) {
        List<ExperienceResponse> experiences =
                experienceService.getAllExperiences(workspaceId).stream()
                        .map(experienceService::toResponse)
                        .map(ExperienceResponse::forPublicWeb)
                        .toList();
        List<ExperienceResponse> coreProjects =
                experiencePlacementService
                        .getEnabledSelections(workspaceId, ExperiencePlacementType.CORE_PROJECT)
                        .stream()
                        .map(
                                selection ->
                                        experienceService
                                                .toResponse(selection.experience())
                                                .withSelectedDetails(selection.detailIds())
                                                .forPublicWeb())
                        .toList();
        return new PublicExperienceSnapshot(
                experiences, coreProjects, portfolioCaseStudyService.listPublished(workspaceId));
    }

    private String calculateCareerSummary(List<ExperienceResponse> experiences) {
        List<ExperienceResponse> careers =
                experiences.stream()
                        .filter(experience -> "CAREER".equals(experience.type()))
                        .sorted(Comparator.comparing(ExperienceResponse::periodStart))
                        .toList();
        long totalMonths = 0;
        YearMonth mergedStart = null;
        YearMonth mergedEnd = null;
        for (ExperienceResponse career : careers) {
            YearMonth start = YearMonth.from(career.periodStart());
            YearMonth end =
                    career.periodEnd() == null
                            ? YearMonth.now()
                            : YearMonth.from(career.periodEnd());
            if (end.isBefore(start)) continue;
            if (mergedStart == null) {
                mergedStart = start;
                mergedEnd = end;
                continue;
            }
            if (!start.isAfter(mergedEnd.plusMonths(1))) {
                if (end.isAfter(mergedEnd)) mergedEnd = end;
            } else {
                totalMonths += Math.max(1, ChronoUnit.MONTHS.between(mergedStart, mergedEnd));
                mergedStart = start;
                mergedEnd = end;
            }
        }
        if (mergedStart != null) {
            totalMonths += Math.max(1, ChronoUnit.MONTHS.between(mergedStart, mergedEnd));
        }
        if (totalMonths == 0) return "경력 없음";
        long years = totalMonths / 12;
        long months = totalMonths % 12;
        if (years == 0) return months + "개월";
        if (months == 0) return years + "년";
        return years + "년 " + months + "개월";
    }
}
