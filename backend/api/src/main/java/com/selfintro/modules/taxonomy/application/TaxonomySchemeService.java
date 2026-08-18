package com.selfintro.modules.taxonomy.application;

import com.selfintro.modules.taxonomy.domain.entity.TaxonomyScheme;
import com.selfintro.modules.taxonomy.domain.entity.TaxonomySchemeScope;
import com.selfintro.modules.taxonomy.domain.entity.TaxonomySchemeStatus;
import com.selfintro.modules.taxonomy.domain.entity.WorkspaceTaxonomySchemeSubscription;
import com.selfintro.modules.taxonomy.domain.repository.TaxonomySchemeRepository;
import com.selfintro.modules.taxonomy.domain.repository.WorkspaceTaxonomySchemeSubscriptionRepository;
import com.selfintro.modules.taxonomy.presentation.dto.TaxonomySchemeResponse;
import com.selfintro.modules.taxonomy.presentation.dto.WorkspaceTaxonomySchemeSelectionRequest;
import jakarta.persistence.EntityNotFoundException;
import java.util.LinkedHashSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TaxonomySchemeService {

    private static final String DEFAULT_FAMILY_KEY = "software-engineering";
    private static final int DEFAULT_VERSION = 1;

    private final TaxonomySchemeRepository schemeRepository;
    private final WorkspaceTaxonomySchemeSubscriptionRepository subscriptionRepository;

    public List<TaxonomySchemeResponse> listPlatformCatalog() {
        return schemeRepository
                .findAllByScopeTypeAndStatusOrderByFamilyKeyAscVersionDesc(
                        TaxonomySchemeScope.PLATFORM, TaxonomySchemeStatus.ACTIVE)
                .stream()
                .map(TaxonomySchemeResponse::catalog)
                .toList();
    }

    public List<TaxonomySchemeResponse> listSubscriptions(Long workspaceId) {
        return subscriptionRepository
                .findAllByWorkspaceIdAndEnabledTrueOrderByDisplayOrderAscIdAsc(workspaceId)
                .stream()
                .map(
                        subscription ->
                                TaxonomySchemeResponse.subscribed(
                                        subscription.getScheme(),
                                        subscription.isPrimaryScheme(),
                                        subscription.getDisplayOrder()))
                .toList();
    }

    @Transactional
    public void ensureDefaultSubscription(Long workspaceId) {
        TaxonomyScheme scheme = defaultScheme();
        if (!subscriptionRepository.existsByWorkspaceIdAndSchemeId(workspaceId, scheme.getId())) {
            subscriptionRepository.save(
                    WorkspaceTaxonomySchemeSubscription.primary(workspaceId, scheme));
        }
    }

    @Transactional
    public List<TaxonomySchemeResponse> replaceSubscriptions(
            Long workspaceId, WorkspaceTaxonomySchemeSelectionRequest request) {
        LinkedHashSet<Long> distinctIds = new LinkedHashSet<>(request.schemeIds());
        if (distinctIds.size() != request.schemeIds().size()) {
            throw new IllegalArgumentException("Taxonomy scheme selection contains duplicates.");
        }
        Long primarySchemeId =
                request.primarySchemeId() == null
                        ? distinctIds.iterator().next()
                        : request.primarySchemeId();
        if (!distinctIds.contains(primarySchemeId)) {
            throw new IllegalArgumentException("Primary taxonomy scheme must be selected.");
        }

        List<TaxonomyScheme> schemes = schemeRepository.findAllById(distinctIds);
        if (schemes.size() != distinctIds.size()
                || schemes.stream().anyMatch(scheme -> !selectableBy(workspaceId, scheme))) {
            throw new EntityNotFoundException("Selectable taxonomy scheme not found.");
        }

        subscriptionRepository.deleteAllByWorkspaceId(workspaceId);
        subscriptionRepository.flush();
        int displayOrder = 0;
        for (Long schemeId : distinctIds) {
            TaxonomyScheme scheme =
                    schemes.stream()
                            .filter(candidate -> candidate.getId().equals(schemeId))
                            .findFirst()
                            .orElseThrow();
            subscriptionRepository.save(
                    WorkspaceTaxonomySchemeSubscription.create(
                            workspaceId,
                            scheme,
                            scheme.getId().equals(primarySchemeId),
                            displayOrder++));
        }
        return listSubscriptions(workspaceId);
    }

    private TaxonomyScheme defaultScheme() {
        return schemeRepository
                .findByScopeTypeAndFamilyKeyAndVersion(
                        TaxonomySchemeScope.PLATFORM, DEFAULT_FAMILY_KEY, DEFAULT_VERSION)
                .orElseGet(
                        () ->
                                schemeRepository.save(
                                        TaxonomyScheme.createPlatform(
                                                DEFAULT_FAMILY_KEY,
                                                DEFAULT_VERSION,
                                                "소프트웨어 엔지니어링",
                                                "개발·백엔드·인프라·AI 학습 기록 기본 template")));
    }

    private boolean selectableBy(Long workspaceId, TaxonomyScheme scheme) {
        return scheme.getStatus() == TaxonomySchemeStatus.ACTIVE
                && (scheme.getScopeType() == TaxonomySchemeScope.PLATFORM
                        || workspaceId.equals(scheme.getWorkspaceId()));
    }
}
