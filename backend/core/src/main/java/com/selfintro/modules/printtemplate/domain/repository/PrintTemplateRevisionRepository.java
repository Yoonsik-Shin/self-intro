package com.selfintro.modules.printtemplate.domain.repository;

import com.selfintro.modules.printtemplate.domain.entity.PrintTemplateRevision;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrintTemplateRevisionRepository
        extends JpaRepository<PrintTemplateRevision, Long> {

    List<PrintTemplateRevision> findByPrintTemplateIdOrderByIdAsc(Long printTemplateId);
}
