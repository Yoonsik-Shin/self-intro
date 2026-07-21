package com.selfintro.connections;

import com.selfintro.connections.dto.ConnectionDtos.ExperienceConnections;
import com.selfintro.connections.dto.ConnectionDtos.RelatedExperienceResponse;
import com.selfintro.connections.dto.ConnectionDtos.SkillConnections;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class PortfolioConnectionController {

    private final PortfolioConnectionService connectionService;

    @GetMapping("/api/admin/skills/{id}/connections")
    public SkillConnections getSkillConnections(@PathVariable Long id) {
        return connectionService.getSkillConnections(id);
    }

    @PutMapping("/api/admin/skills/{id}/connections")
    public SkillConnections updateSkillConnections(
            @PathVariable Long id, @Valid @RequestBody SkillConnections request) {
        return connectionService.updateSkillConnections(id, request);
    }

    @GetMapping("/api/admin/experiences/{id}/connections")
    public ExperienceConnections getExperienceConnections(@PathVariable Long id) {
        return connectionService.getExperienceConnections(id);
    }

    @PutMapping("/api/admin/experiences/{id}/connections")
    public ExperienceConnections updateExperienceConnections(
            @PathVariable Long id, @Valid @RequestBody ExperienceConnections request) {
        return connectionService.updateExperienceConnections(id, request);
    }

    @GetMapping("/api/experiences/{id}/related")
    public List<RelatedExperienceResponse> getRelatedExperiences(@PathVariable Long id) {
        return connectionService.getRelatedExperiences(id);
    }
}
