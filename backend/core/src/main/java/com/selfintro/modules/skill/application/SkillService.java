package com.selfintro.modules.skill.application;

import com.selfintro.modules.competency.domain.repository.CompetencyRepository;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.entity.WorkspaceSkill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import com.selfintro.modules.skill.domain.repository.WorkspaceSkillRepository;
import com.selfintro.modules.skill.presentation.dto.SkillRequest;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import com.selfintro.modules.skill.presentation.dto.WorkspaceSkillCreateRequest;
import com.selfintro.modules.skill.presentation.dto.WorkspaceSkillUpdateRequest;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SkillService {

    private final SkillRepository skillRepository;
    private final WorkspaceSkillRepository workspaceSkillRepository;
    private final StudyRepository studyRepository;
    private final ExperienceRepository experienceRepository;
    private final CompetencyRepository competencyRepository;

    public List<Skill> getAllSkills() {
        return skillRepository.findAllByOrderByDisplayOrderAsc();
    }

    public List<Skill> getCoreSkills() {
        return skillRepository.findAllByIsCoreTrueOrderByDisplayOrderAsc();
    }

    public List<WorkspaceSkill> getWorkspaceSkills(Long workspaceId) {
        return workspaceSkillRepository.findAllByWorkspaceIdOrderByDisplayOrderAsc(workspaceId);
    }

    public List<WorkspaceSkill> getWorkspaceCoreSkills(Long workspaceId) {
        return workspaceSkillRepository.findAllByWorkspaceIdAndCoreTrueOrderByDisplayOrderAsc(
                workspaceId);
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public SkillResponse addToWorkspace(Long workspaceId, WorkspaceSkillCreateRequest request) {
        Skill catalogSkill =
                skillRepository
                        .findById(request.catalogSkillId())
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "공통 기술 카탈로그에 없는 기술입니다. 운영자에게 카탈로그 등록을 요청해 주세요."));
        if (workspaceSkillRepository
                .findByWorkspaceIdAndSkillId(workspaceId, catalogSkill.getId())
                .isPresent()) {
            throw new IllegalArgumentException("이미 Workspace에 추가된 기술입니다.");
        }
        WorkspaceSkill workspaceSkill =
                WorkspaceSkill.create(
                        workspaceId,
                        catalogSkill,
                        request.skillLevel(),
                        request.skillVersion(),
                        request.comment(),
                        request.usageType(),
                        request.isCore(),
                        request.displayOrder());
        return SkillResponse.from(workspaceSkillRepository.save(workspaceSkill));
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public SkillResponse updateWorkspaceSkill(
            Long workspaceId, Long catalogSkillId, WorkspaceSkillUpdateRequest request) {
        WorkspaceSkill workspaceSkill =
                workspaceSkillRepository
                        .findByWorkspaceIdAndSkillId(workspaceId, catalogSkillId)
                        .orElseThrow(
                                () -> new IllegalArgumentException("Workspace 기술을 찾을 수 없습니다."));
        workspaceSkill.update(
                request.skillLevel(),
                request.skillVersion(),
                request.comment(),
                request.usageType(),
                request.isCore(),
                request.displayOrder());
        return SkillResponse.from(workspaceSkill);
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public void removeFromWorkspace(Long workspaceId, Long catalogSkillId) {
        WorkspaceSkill workspaceSkill =
                workspaceSkillRepository
                        .findByWorkspaceIdAndSkillId(workspaceId, catalogSkillId)
                        .orElseThrow(
                                () -> new IllegalArgumentException("Workspace 기술을 찾을 수 없습니다."));
        if (studyRepository.existsByWorkspaceIdAndSkills_Id(workspaceId, catalogSkillId)
                || experienceRepository.existsByWorkspaceIdAndSkills_Id(workspaceId, catalogSkillId)
                || experienceRepository.existsByWorkspaceIdAndDetails_Skills_Id(
                        workspaceId, catalogSkillId)
                || competencyRepository.existsByWorkspaceIdAndSkillLinks_Skill_Id(
                        workspaceId, catalogSkillId)) {
            throw new IllegalArgumentException(
                    "연결된 Study·Experience·Competency를 먼저 해제해야 기술을 삭제할 수 있습니다.");
        }
        workspaceSkillRepository.delete(workspaceSkill);
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public Skill create(SkillRequest request) {
        Skill skill =
                Skill.createCatalog(
                        request.name(),
                        request.category(),
                        request.badgeKey(),
                        request.badgeColor());
        return skillRepository.save(skill);
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public Skill update(Long id, SkillRequest request) {
        Skill skill =
                skillRepository
                        .findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 기술 스택입니다."));
        skill.updateCatalogDefinition(
                request.name(),
                request.category(),
                request.badgeKey(),
                request.badgeColor());
        return skillRepository.save(skill);
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public void delete(Long id) {
        if (!skillRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 기술 스택입니다.");
        }
        skillRepository.deleteById(id);
    }
}
