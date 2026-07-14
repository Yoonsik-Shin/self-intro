package com.selfintro.modules.skill.presentation;

import com.selfintro.modules.skill.application.SkillService;
import com.selfintro.modules.skill.presentation.dto.SkillRequest;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;

    @GetMapping
    public ResponseEntity<List<SkillResponse>> list() {
        List<SkillResponse> responses = skillService.getAllSkills().stream()
            .map(SkillResponse::from)
            .toList();
        return ResponseEntity.ok(responses);
    }

    @PostMapping
    public ResponseEntity<SkillResponse> create(@Valid @RequestBody SkillRequest request) {
        return ResponseEntity.ok(SkillResponse.from(skillService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SkillResponse> update(@PathVariable Long id, @Valid @RequestBody SkillRequest request) {
        return ResponseEntity.ok(SkillResponse.from(skillService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        skillService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
