package com.selfintro.modules.experience.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.aiusage.application.AiExecutionCommand;
import com.selfintro.modules.aiusage.application.AiExecutionService;
import com.selfintro.modules.aiusage.application.AiFeature;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeResponse;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionResponse;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import jakarta.validation.Valid;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/experiences/manage/ai")
@RequiredArgsConstructor
public class WorkspaceExperienceAiController {

    private final AiWorkerClient aiWorkerClient;
    private final AiExecutionService aiExecutionService;

    @PostMapping("/suggestions")
    public ExperienceSuggestionResponse suggest(
            @CurrentWorkspace WorkspaceMember member,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @Valid @RequestBody ExperienceSuggestionRequest request) {
        Long workspaceId = member.getWorkspace().getId();
        return aiExecutionService.execute(
                command(member, "EXPERIENCE_SUGGESTIONS", 100, consentVersion),
                () ->
                        aiWorkerClient.post(
                                "/internal/workspaces/"
                                        + workspaceId
                                        + "/experiences/manage/ai/suggestions",
                                request,
                                ExperienceSuggestionResponse.class));
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody suggestStream(
            @CurrentWorkspace WorkspaceMember member,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @Valid @RequestBody ExperienceSuggestionRequest request) {
        Long workspaceId = member.getWorkspace().getId();
        String path =
                "/internal/workspaces/" + workspaceId + "/experiences/manage/ai/suggestions/stream";
        return outputStream ->
                aiExecutionService.executeVoid(
                        command(member, "EXPERIENCE_SUGGESTIONS_STREAM", 100, consentVersion),
                        () -> aiWorkerClient.pipePost(path, request, outputStream));
    }

    @PostMapping("/details/narrative")
    public ExperienceDetailNarrativeResponse generateNarrative(
            @CurrentWorkspace WorkspaceMember member,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @Valid @RequestBody ExperienceDetailNarrativeRequest request) {
        Long workspaceId = member.getWorkspace().getId();
        return aiExecutionService.execute(
                command(member, "EXPERIENCE_NARRATIVE", 40, consentVersion),
                () ->
                        aiWorkerClient.post(
                                "/internal/workspaces/"
                                        + workspaceId
                                        + "/experiences/manage/ai/details/narrative",
                                request,
                                ExperienceDetailNarrativeResponse.class));
    }

    private AiExecutionCommand command(
            WorkspaceMember member, String operation, int points, String consentVersion) {
        return new AiExecutionCommand(
                member.getWorkspace().getId(),
                member.getUser().getId(),
                AiFeature.EXPERIENCE,
                operation,
                points,
                consentVersion,
                Set.of("EXPERIENCE", "USER_INSTRUCTION"));
    }
}
