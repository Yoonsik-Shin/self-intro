package com.selfintro.modules.skill.domain.repository;

import com.selfintro.modules.skill.domain.entity.SkillProposal;
import com.selfintro.modules.skill.domain.enums.SkillReviewStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkillProposalRepository extends JpaRepository<SkillProposal, Long> {
    List<SkillProposal> findAllByWorkspaceIdOrderByCreatedAtDesc(Long workspaceId);

    List<SkillProposal> findAllByReviewStatusOrderByCreatedAtAsc(SkillReviewStatus reviewStatus);

    Optional<SkillProposal> findByWorkspaceIdAndNameIgnoreCase(Long workspaceId, String name);
}
