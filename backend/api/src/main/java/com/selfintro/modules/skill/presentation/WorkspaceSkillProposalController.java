package com.selfintro.modules.skill.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.skill.application.SkillService;
import com.selfintro.modules.skill.presentation.dto.SkillProposalRequest;
import com.selfintro.modules.skill.presentation.dto.SkillProposalResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/skill-proposals")
@RequiredArgsConstructor
public class WorkspaceSkillProposalController {

    private final SkillService skillService;

    @GetMapping
    public List<SkillProposalResponse> list(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId) {
        return skillService.getWorkspaceProposals(workspaceId);
    }

    @PostMapping
    public SkillProposalResponse propose(
            @CurrentWorkspace Long workspaceId, @Valid @RequestBody SkillProposalRequest request) {
        return skillService.proposeSkill(workspaceId, request);
    }
}
