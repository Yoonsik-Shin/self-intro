package com.selfintro.modules.skill.presentation;

import com.selfintro.modules.skill.application.SkillConnectionService;
import com.selfintro.modules.skill.presentation.dto.SkillConnections;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/skills")
public class SkillConnectionController {

    private final SkillConnectionService connectionService;

    @GetMapping("/{id}/connections")
    public SkillConnections getSkillConnections(@PathVariable Long id) {
        return connectionService.getSkillConnections(id);
    }

    @PutMapping("/{id}/connections")
    public SkillConnections updateSkillConnections(
            @PathVariable Long id, @Valid @RequestBody SkillConnections request) {
        return connectionService.updateSkillConnections(id, request);
    }
}
