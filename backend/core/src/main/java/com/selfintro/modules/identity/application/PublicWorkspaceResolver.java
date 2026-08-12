package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspacePublicationStatus;
import com.selfintro.modules.identity.domain.WorkspaceStatus;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicationRevisionRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PublicWorkspaceResolver {

    private final WorkspacePublicationRevisionRepository publicationRevisionRepository;
    private final WorkspaceSlugService workspaceSlugService;

    @Value("${app.public-workspace-slug:w-199d6de326de71385a98}")
    private String defaultPublicWorkspaceSlug;

    @Transactional(readOnly = true)
    public Workspace requireDefaultPublicWorkspace() {
        return findDefaultPublicWorkspace()
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "공개 Workspace를 찾을 수 없습니다."));
    }

    @Transactional(readOnly = true)
    public Optional<Workspace> findDefaultPublicWorkspace() {
        return workspaceSlugService
                .resolveActive(defaultPublicWorkspaceSlug)
                .filter(workspace -> workspace.getStatus() == WorkspaceStatus.ACTIVE)
                .filter(
                        workspace ->
                                workspace.getPublicationStatus()
                                        == WorkspacePublicationStatus.PUBLISHED)
                .filter(
                        workspace ->
                                publicationRevisionRepository
                                        .findTopByWorkspaceIdOrderByRevisionNumberDesc(
                                                workspace.getId())
                                        .isPresent());
    }

    @Transactional(readOnly = true)
    public Workspace requireBySlug(String slug) {
        Workspace workspace =
                workspaceSlugService
                        .resolveActive(slug)
                        .filter(candidate -> candidate.getStatus() == WorkspaceStatus.ACTIVE)
                        .filter(
                                candidate ->
                                        candidate.getPublicationStatus()
                                                == WorkspacePublicationStatus.PUBLISHED)
                        .orElseThrow(this::publicWorkspaceNotFound);
        if (publicationRevisionRepository
                .findTopByWorkspaceIdOrderByRevisionNumberDesc(workspace.getId())
                .isEmpty()) {
            throw publicWorkspaceNotFound();
        }
        return workspace;
    }

    private ResponseStatusException publicWorkspaceNotFound() {
        // 비공개, 미발행, revision 누락, 존재하지 않는 Workspace를 같은 응답으로 숨긴다.
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "공개 Workspace를 찾을 수 없습니다.");
    }
}
