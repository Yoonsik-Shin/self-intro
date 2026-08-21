package com.selfintro.modules.study.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.aiusage.application.AiExecutionCommand;
import com.selfintro.modules.aiusage.application.AiExecutionService;
import com.selfintro.modules.aiusage.application.AiFeature;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.study.presentation.dto.StudySuggestionRequest;
import com.selfintro.modules.study.presentation.dto.StudySuggestionResponse;
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
@RequestMapping("/api/workspaces/{workspaceSlug}/studies/manage/ai")
@RequiredArgsConstructor
public class WorkspaceStudyAiController {

    private final AiWorkerClient aiWorkerClient;
    private final AiExecutionService aiExecutionService;

    @PostMapping("/suggestions")
    public StudySuggestionResponse suggest(
            @CurrentWorkspace WorkspaceMember member,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @Valid @RequestBody StudySuggestionRequest request) {
        Long workspaceId = member.getWorkspace().getId();
        return aiExecutionService.execute(
                command(member, "STUDY_SUGGESTIONS", consentVersion),
                () ->
                        aiWorkerClient.post(
                                "/internal/workspaces/"
                                        + workspaceId
                                        + "/studies/manage/ai/suggestions",
                                request,
                                StudySuggestionResponse.class));
    }

    @PostMapping(value = "/suggestions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody suggestStream(
            @CurrentWorkspace WorkspaceMember member,
            @RequestHeader(value = "X-AI-Processing-Consent", required = false)
                    String consentVersion,
            @Valid @RequestBody StudySuggestionRequest request) {
        Long workspaceId = member.getWorkspace().getId();
        String path =
                "/internal/workspaces/" + workspaceId + "/studies/manage/ai/suggestions/stream";
        return outputStream ->
                aiExecutionService.executeVoid(
                        command(member, "STUDY_SUGGESTIONS_STREAM", consentVersion),
                        () -> aiWorkerClient.pipePost(path, request, outputStream));
    }

    private AiExecutionCommand command(
            WorkspaceMember member, String operation, String consentVersion) {
        return new AiExecutionCommand(
                member.getWorkspace().getId(),
                member.getUser().getId(),
                AiFeature.STUDY,
                operation,
                100,
                consentVersion,
                Set.of("STUDY", "USER_INSTRUCTION"));
    }
}
