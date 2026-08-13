package com.selfintro.modules.skill.presentation;

import com.selfintro.modules.skill.application.SkillService;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/skill-catalog")
@RequiredArgsConstructor
public class SkillCatalogController {

    private final SkillService skillService;

    @GetMapping
    public List<SkillResponse> list() {
        return skillService.getAllSkills().stream().map(SkillResponse::fromCatalog).toList();
    }
}
