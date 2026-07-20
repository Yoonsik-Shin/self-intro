package com.selfintro.modules.printtemplate.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PrintTemplateRepository extends JpaRepository<PrintTemplate, Long> {

    List<PrintTemplate> findAllByVisibleTrueOrderByDisplayOrderAsc();

    List<PrintTemplate> findAllByOrderByDisplayOrderAsc();
}
