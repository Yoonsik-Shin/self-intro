package com.selfintro.bff.presentation;

import com.selfintro.bff.application.BffService;
import com.selfintro.bff.presentation.dto.IntroductionResponse;
import com.selfintro.bff.presentation.dto.LearningResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bff")
@RequiredArgsConstructor
public class BffController {

    private final BffService bffService;

    @GetMapping("/introduction")
    public ResponseEntity<IntroductionResponse> getIntroduction() {
        return ResponseEntity.ok(bffService.getIntroduction());
    }

    @GetMapping("/learning")
    public ResponseEntity<LearningResponse> getLearning() {
        return ResponseEntity.ok(bffService.getLearning());
    }
}
