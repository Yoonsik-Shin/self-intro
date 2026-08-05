package com.selfintro.modules.taxonomy.application;

import com.selfintro.modules.taxonomy.domain.entity.TaxonomyNode;
import com.selfintro.modules.taxonomy.domain.repository.TaxonomyNodeRepository;
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

    public List<TaxonomyNodeResponse> findAll() {
        return taxonomyNodeRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(TaxonomyNodeResponse::from)
                .toList();
    }

    @Transactional
    public TaxonomyNodeResponse create(TaxonomyNodeRequest request) {
        TaxonomyNode parent = findOptionalNode(request.parentId());
        TaxonomyNode node =
                TaxonomyNode.create(
                        request.name().trim(), request.slug().trim(), request.displayOrder(), parent);
        return TaxonomyNodeResponse.from(taxonomyNodeRepository.save(node));
    }

    @Transactional
    public TaxonomyNodeResponse update(Long id, TaxonomyNodeRequest request) {
        TaxonomyNode node = findNode(id);
        if (request.parentId() != null && request.parentId().equals(id)) {
            throw new IllegalArgumentException("A taxonomy node cannot be its own parent.");
        }
        TaxonomyNode parent = findOptionalNode(request.parentId());
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
}
