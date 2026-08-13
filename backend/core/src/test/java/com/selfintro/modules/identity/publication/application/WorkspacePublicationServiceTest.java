package com.selfintro.modules.identity.publication.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.selfintro.modules.identity.publication.domain.PublicationOperationType;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicationRevision;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class WorkspacePublicationServiceTest {

    @Test
    void retentionKeepsMinimumCountAndRecentRevisions() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 11, 0, 0);
        List<WorkspacePublicationRevision> revisions =
                List.of(
                        revision(4, now.minusDays(1)),
                        revision(3, now.minusDays(2)),
                        revision(2, now.minusDays(10)),
                        revision(1, now.minusDays(200)));

        var expired =
                WorkspacePublicationService.expiredRevisions(revisions, 2, now.minusDays(180));

        assertThat(expired)
                .extracting(WorkspacePublicationRevision::getRevisionNumber)
                .containsExactly(1);
    }

    private WorkspacePublicationRevision revision(int revisionNumber, LocalDateTime createdAt) {
        return WorkspacePublicationRevision.create(
                1L,
                revisionNumber,
                WorkspacePublicationService.CURRENT_SCHEMA_VERSION,
                PublicationOperationType.PUBLISH,
                null,
                1L,
                createdAt);
    }
}
