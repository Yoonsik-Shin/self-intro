package com.selfintro.modules.skill.application;

import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.modules.skill.presentation.dto.SkillRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SkillService {

    private final SkillRepository skillRepository;

    public List<Skill> getAllSkills() {
        return skillRepository.findAllByOrderByDisplayOrderAsc();
    }

    public List<Skill> getCoreSkills() {
        return skillRepository.findAllByIsCoreTrueOrderByDisplayOrderAsc();
    }

    @Transactional
    public Skill create(SkillRequest request) {
        Skill skill = Skill.create(
            request.name(),
            request.category(),
            request.skillLevel(),
            request.skillVersion(),
            request.comment(),
            request.usageType(),
            request.badgeKey(),
            request.badgeColor(),
            request.isCore(),
            request.displayOrder()
        );
        return skillRepository.save(skill);
    }

    @Transactional
    public Skill update(Long id, SkillRequest request) {
        Skill skill = skillRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 기술 스택입니다."));
        skill.update(
            request.name(),
            request.category(),
            request.skillLevel(),
            request.skillVersion(),
            request.comment(),
            request.usageType(),
            request.badgeKey(),
            request.badgeColor(),
            request.isCore(),
            request.displayOrder()
        );
        return skillRepository.save(skill);
    }

    @Transactional
    public void delete(Long id) {
        if (!skillRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 기술 스택입니다.");
        }
        skillRepository.deleteById(id);
    }
}
