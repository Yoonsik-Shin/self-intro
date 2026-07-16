package com.selfintro.modules.experience.application;

import com.selfintro.modules.experience.domain.*;
import com.selfintro.modules.experience.presentation.dto.ExperiencePlacementRequest;
import com.selfintro.modules.experience.presentation.dto.ExperiencePlacementResponse;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExperiencePlacementService {

    private final ExperiencePlacementRepository placementRepository;
    private final ExperiencePlacementDetailRepository placementDetailRepository;
    private final ExperienceRepository experienceRepository;

    public List<ExperiencePlacementResponse> getAll(ExperiencePlacementType placementType) {
        return placementRepository.findAllByPlacementTypeOrderByDisplayOrderAsc(placementType).stream()
            .map(this::toResponse)
            .toList();
    }

    public List<SelectedExperience> getEnabledSelections(ExperiencePlacementType placementType) {
        return placementRepository
            .findAllByPlacementTypeAndEnabledTrueOrderByDisplayOrderAsc(placementType)
            .stream()
            .map(placement -> new SelectedExperience(
                placement.getExperience(),
                getSelectedDetailIds(placement)
            ))
            .toList();
    }

    @Transactional
    public List<ExperiencePlacementResponse> replaceAll(
        ExperiencePlacementType placementType,
        List<ExperiencePlacementRequest> requests
    ) {
        List<ExperiencePlacementRequest> safeRequests = requests == null ? List.of() : requests;
        Set<Long> uniqueIds = new HashSet<>();
        for (ExperiencePlacementRequest request : safeRequests) {
            if (!uniqueIds.add(request.experienceId())) {
                throw new IllegalArgumentException("동일한 이력을 핵심 프로젝트에 중복 등록할 수 없습니다.");
            }
        }

        Map<Long, Experience> experiences = experienceRepository.findAllById(uniqueIds).stream()
            .collect(Collectors.toMap(Experience::getId, Function.identity()));
        if (experiences.size() != uniqueIds.size()) {
            throw new IllegalArgumentException("존재하지 않는 이력이 포함되어 있습니다.");
        }

        for (Experience experience : experiences.values()) {
            if (!"PROJECT".equals(experience.getType())) {
                throw new IllegalArgumentException("프로젝트만 핵심 프로젝트로 편성할 수 있습니다.");
            }
        }

        Map<Long, List<Long>> selectedDetailIds = safeRequests.stream()
            .collect(Collectors.toMap(
                ExperiencePlacementRequest::experienceId,
                request -> validateAndNormalizeDetailIds(
                    experiences.get(request.experienceId()),
                    request.detailIds()
                )
            ));

        placementRepository.deleteAllByPlacementType(placementType);
        placementRepository.flush();

        List<ExperiencePlacement> saved = placementRepository.saveAll(
            safeRequests.stream()
                .map(request -> ExperiencePlacement.create(
                    experiences.get(request.experienceId()),
                    placementType,
                    request.displayOrder(),
                    request.enabled()
                ))
                .toList()
        );
        placementRepository.flush();

        Map<Long, ExperiencePlacement> placementsByExperienceId = saved.stream()
            .collect(Collectors.toMap(
                placement -> placement.getExperience().getId(),
                Function.identity()
            ));

        List<ExperiencePlacementDetail> detailMappings = safeRequests.stream()
            .flatMap(request -> {
                Experience experience = experiences.get(request.experienceId());
                Map<Long, ExperienceDetail> detailsById = experience.getDetails().stream()
                    .collect(Collectors.toMap(ExperienceDetail::getId, Function.identity()));
                ExperiencePlacement placement = placementsByExperienceId.get(request.experienceId());
                List<Long> detailIds = selectedDetailIds.get(request.experienceId());
                return java.util.stream.IntStream.range(0, detailIds.size())
                    .mapToObj(index -> ExperiencePlacementDetail.create(
                        placement,
                        detailsById.get(detailIds.get(index)),
                        index
                    ));
            })
            .toList();
        placementDetailRepository.saveAll(detailMappings);

        return saved.stream()
            .sorted(java.util.Comparator.comparingInt(ExperiencePlacement::getDisplayOrder))
            .map(placement -> ExperiencePlacementResponse.from(
                placement,
                selectedDetailIds.get(placement.getExperience().getId())
            ))
            .toList();
    }

    private List<Long> validateAndNormalizeDetailIds(Experience experience, List<Long> requestedDetailIds) {
        List<Long> availableDetailIds = experience.getDetails().stream()
            .map(ExperienceDetail::getId)
            .toList();
        List<Long> selectedIds = requestedDetailIds == null ? availableDetailIds : requestedDetailIds;
        if (selectedIds.stream().distinct().count() != selectedIds.size()) {
            throw new IllegalArgumentException("동일한 상세 경험을 중복 선택할 수 없습니다.");
        }
        if (!new HashSet<>(availableDetailIds).containsAll(selectedIds)) {
            throw new IllegalArgumentException("해당 프로젝트에 속하지 않은 상세 경험이 포함되어 있습니다.");
        }
        return List.copyOf(selectedIds);
    }

    private ExperiencePlacementResponse toResponse(ExperiencePlacement placement) {
        return ExperiencePlacementResponse.from(placement, getSelectedDetailIds(placement));
    }

    private List<Long> getSelectedDetailIds(ExperiencePlacement placement) {
        return placementDetailRepository.findAllByPlacementIdOrderByDisplayOrderAsc(placement.getId()).stream()
            .map(mapping -> mapping.getDetail().getId())
            .toList();
    }

    public record SelectedExperience(Experience experience, List<Long> detailIds) {}
}
