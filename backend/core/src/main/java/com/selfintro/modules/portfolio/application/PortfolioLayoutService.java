package com.selfintro.modules.portfolio.application;

import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudy;
import com.selfintro.modules.portfolio.domain.entity.PortfolioLayout;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRepository;
import com.selfintro.modules.portfolio.domain.repository.PortfolioLayoutRepository;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioLayoutRequest;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioLayoutResponse;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioLayoutService {

    private final PortfolioLayoutRepository layoutRepository;
    private final PortfolioCaseStudyRepository caseStudyRepository;

    public List<PortfolioLayoutResponse> list(Long caseStudyId) {
        return layoutRepository.findAllByCaseStudyIdOrderByUpdatedAtDesc(caseStudyId).stream()
                .map(PortfolioLayoutResponse::from)
                .toList();
    }

    @Transactional
    public PortfolioLayoutResponse create(Long caseStudyId, PortfolioLayoutRequest request) {
        if (!caseStudyRepository.existsById(caseStudyId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 케이스스터디입니다.");
        }
        if (request.isDefault()) {
            clearExistingDefault(caseStudyId, request.orientation());
        }
        PortfolioLayout layout =
                PortfolioLayout.create(
                        caseStudyId,
                        request.orientation(),
                        request.name(),
                        PortfolioLayout.SOURCE_MANUAL,
                        request.excludedIdsJson(),
                        request.sectionOrderJson(),
                        request.sectionGapsJson(),
                        request.itemOrderOverridesJson(),
                        request.forcedPageOverridesJson(),
                        request.contentOverridesJson(),
                        request.isDefault());
        return PortfolioLayoutResponse.from(layoutRepository.save(layout));
    }

    @Transactional
    public PortfolioLayoutResponse update(Long id, PortfolioLayoutRequest request) {
        PortfolioLayout layout = findOrThrow(id);
        if (request.isDefault() && !layout.isDefault()) {
            clearExistingDefault(layout.getCaseStudyId(), layout.getOrientation());
        }
        layout.update(
                request.name(),
                request.excludedIdsJson(),
                request.sectionOrderJson(),
                request.sectionGapsJson(),
                request.itemOrderOverridesJson(),
                request.forcedPageOverridesJson(),
                request.contentOverridesJson(),
                request.isDefault());
        return PortfolioLayoutResponse.from(layout);
    }

    @Transactional
    public void delete(Long id) {
        if (!layoutRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 레이아웃입니다.");
        }
        layoutRepository.deleteById(id);
    }

    public Optional<PortfolioLayoutResponse> getDefaultForSlug(String slug, String orientation) {
        PortfolioCaseStudy caseStudy =
                caseStudyRepository
                        .findBySlugAndStatus(slug, PortfolioCaseStudy.STATUS_PUBLISHED)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "존재하지 않는 포트폴리오입니다."));
        return layoutRepository
                .findByCaseStudyIdAndOrientationAndIsDefaultTrue(caseStudy.getId(), orientation)
                .map(PortfolioLayoutResponse::from);
    }

    private void clearExistingDefault(Long caseStudyId, String orientation) {
        layoutRepository
                .findByCaseStudyIdAndOrientationAndIsDefaultTrue(caseStudyId, orientation)
                .ifPresent(PortfolioLayout::clearDefault);
    }

    private PortfolioLayout findOrThrow(Long id) {
        return layoutRepository
                .findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 레이아웃입니다."));
    }
}
