package com.selfintro.modules.printtemplate.domain.repository;

import com.selfintro.modules.printtemplate.domain.entity.PrintDocumentArtifact;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrintDocumentArtifactRepository
        extends JpaRepository<PrintDocumentArtifact, Long> {

    List<PrintDocumentArtifact> findByWorkspaceIdAndPrintTemplateIdOrderByIdDesc(
            Long workspaceId, Long printTemplateId);

    boolean existsByPrintTemplateId(Long printTemplateId);

    boolean existsByObjectKey(String objectKey);
}
