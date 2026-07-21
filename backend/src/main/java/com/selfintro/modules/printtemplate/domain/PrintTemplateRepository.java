package com.selfintro.modules.printtemplate.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrintTemplateRepository extends JpaRepository<PrintTemplate, Long> {

    List<PrintTemplate> findAllByVisibleTrueOrderByDisplayOrderAsc();

    List<PrintTemplate> findAllByOrderByDisplayOrderAsc();
}
