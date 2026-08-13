package com.selfintro.modules.taxonomy.application;

import com.selfintro.modules.taxonomy.domain.entity.TaxonomyNode;
import com.selfintro.modules.taxonomy.domain.entity.TaxonomyScheme;
import com.selfintro.modules.taxonomy.domain.entity.TaxonomySchemeScope;
import com.selfintro.modules.taxonomy.domain.entity.TaxonomySchemeStatus;
import com.selfintro.modules.taxonomy.domain.repository.TaxonomyNodeRepository;
import com.selfintro.modules.taxonomy.domain.repository.TaxonomySchemeRepository;
import com.selfintro.modules.taxonomy.presentation.dto.TaxonomyNodeRequest;
import com.selfintro.modules.taxonomy.presentation.dto.TaxonomyNodeResponse;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TaxonomyService {

    private final TaxonomyNodeRepository taxonomyNodeRepository;
    private final TaxonomySchemeRepository taxonomySchemeRepository;

    public List<TaxonomyNodeResponse> findAll() {
        return taxonomyNodeRepository
                .findAllBySchemeScopeTypeAndSchemeStatusAndStatusOrderByDisplayOrderAscIdAsc(
                        TaxonomySchemeScope.PLATFORM,
                        TaxonomySchemeStatus.ACTIVE,
                        TaxonomySchemeStatus.ACTIVE)
                .stream()
                .map(TaxonomyNodeResponse::from)
                .toList();
    }

    @Transactional
    public TaxonomyNodeResponse create(TaxonomyNodeRequest request) {
        TaxonomyNode parent = findOptionalNode(request.parentId());
        TaxonomyScheme scheme = findScheme(request.schemeId());
        requireSameScheme(scheme, parent);
        TaxonomyNode node =
                TaxonomyNode.create(
                        scheme,
                        request.name().trim(),
                        request.slug().trim(),
                        request.displayOrder(),
                        parent);
        return TaxonomyNodeResponse.from(taxonomyNodeRepository.save(node));
    }

    @Transactional
    public TaxonomyNodeResponse update(Long id, TaxonomyNodeRequest request) {
        TaxonomyNode node = findNode(id);
        if (request.parentId() != null && request.parentId().equals(id)) {
            throw new IllegalArgumentException("A taxonomy node cannot be its own parent.");
        }
        TaxonomyNode parent = findOptionalNode(request.parentId());
        requireSameScheme(node.getScheme(), parent);
        node.update(request.name().trim(), request.slug().trim(), request.displayOrder(), parent);
        return TaxonomyNodeResponse.from(node);
    }

    @Transactional
    public void delete(Long id) {
        TaxonomyNode node = findNode(id);
        if (taxonomyNodeRepository.existsByParentId(id)) {
            throw new IllegalArgumentException("Cannot delete a taxonomy node that has children.");
        }
        if (taxonomyNodeRepository.existsInStudyAttachments(id)
                || taxonomyNodeRepository.existsInLearningResourceAttachments(id)) {
            throw new IllegalArgumentException(
                    "Cannot delete a taxonomy node that is still attached to content.");
        }
        taxonomyNodeRepository.delete(node);
    }

    private TaxonomyNode findNode(Long id) {
        return taxonomyNodeRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Taxonomy node not found: " + id));
    }

    private TaxonomyNode findOptionalNode(Long id) {
        return id == null ? null : findNode(id);
    }

    private TaxonomyScheme findScheme(Long id) {
        if (id != null) {
            return taxonomySchemeRepository
                    .findById(id)
                    .orElseThrow(
                            () -> new EntityNotFoundException("Taxonomy scheme not found: " + id));
        }
        return taxonomySchemeRepository
                .findByScopeTypeAndFamilyKeyAndVersion(
                        TaxonomySchemeScope.PLATFORM, "software-engineering", 1)
                .orElseThrow(
                        () -> new EntityNotFoundException("Default taxonomy scheme not found"));
    }

    private void requireSameScheme(TaxonomyScheme scheme, TaxonomyNode parent) {
        if (parent != null && !parent.getScheme().getId().equals(scheme.getId())) {
            throw new IllegalArgumentException(
                    "Parent and child taxonomy nodes must use the same scheme.");
        }
    }
}
