package com.selfintro.modules.identity.publication.application;

import com.selfintro.modules.identity.domain.WorkspacePublicationStatus;
import com.selfintro.modules.identity.domain.WorkspaceRepository;
import com.selfintro.modules.identity.domain.WorkspaceStatus;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicationRevisionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(100)
@RequiredArgsConstructor
@ConditionalOnProperty(
        name = "app.publication.backfill-enabled",
        havingValue = "true",
        matchIfMissing = true)
public class WorkspacePublicationBackfillRunner implements ApplicationRunner {
    private final WorkspaceRepository workspaceRepository;
    private final WorkspacePublicationRevisionRepository revisionRepository;
    private final WorkspacePublicationService publicationService;

    @Override
    public void run(ApplicationArguments args) {
        workspaceRepository
                .findAllByStatusAndPublicationStatus(
                        WorkspaceStatus.ACTIVE, WorkspacePublicationStatus.PUBLISHED)
                .stream()
                .filter(
                        workspace ->
                                revisionRepository
                                        .findTopByWorkspaceIdOrderByRevisionNumberDesc(
                                                workspace.getId())
                                        .map(
                                                revision ->
                                                        revision.getSchemaVersion()
                                                                < WorkspacePublicationService
                                                                        .CURRENT_SCHEMA_VERSION)
                                        .orElse(true))
                .forEach(workspace -> publicationService.publishSystem(workspace.getId()));
    }
}
