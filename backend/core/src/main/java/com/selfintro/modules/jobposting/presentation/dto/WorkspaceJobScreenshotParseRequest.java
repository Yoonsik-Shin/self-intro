package com.selfintro.modules.jobposting.presentation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record WorkspaceJobScreenshotParseRequest(@NotEmpty @Size(max = 5) List<String> uploadIds) {}
