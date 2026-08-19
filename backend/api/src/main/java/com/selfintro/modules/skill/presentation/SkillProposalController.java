package com.selfintro.modules.skill.presentation;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import com.selfintro.modules.skill.application.SkillService;
import com.selfintro.modules.skill.presentation.dto.SkillProposalResponse;
import com.selfintro.modules.skill.presentation.dto.SkillProposalReviewRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** 플랫폼 운영자가 Workspace 사용자의 기술 카탈로그 제안을 심사한다. {@code /api/admin/**} 권한 경계를 그대로 재사용한다. */
@RestController
@RequestMapping("/api/admin/skill-proposals")
@RequiredArgsConstructor
public class SkillProposalController {

    private final SkillService skillService;
    private final SecurityAuditService securityAuditService;

    @GetMapping
    public List<SkillProposalResponse> pendingReview() {
        return skillService.getPendingProposals();
    }

    @PutMapping("/{id}/review")
    public SkillProposalResponse review(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody SkillProposalReviewRequest request) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        SkillProposalResponse response =
                skillService.reviewProposal(id, principal.userId(), request);
        securityAuditService.recordPlatformTargetAction(
                "SKILL_PROPOSAL_REVIEWED", principal.userId(), "SKILL_PROPOSAL", id);
        return response;
    }

    private AppUserPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return principal;
    }
}
