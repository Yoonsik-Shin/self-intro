package com.selfintro.modules.jobposting.domain.repository;

import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobMapSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceJobMapSettingRepository
        extends JpaRepository<WorkspaceJobMapSetting, Long> {}
