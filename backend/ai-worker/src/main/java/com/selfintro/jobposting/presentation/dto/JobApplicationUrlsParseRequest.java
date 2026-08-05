package com.selfintro.jobposting.presentation.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record JobApplicationUrlsParseRequest(@NotEmpty List<String> urls) {}
