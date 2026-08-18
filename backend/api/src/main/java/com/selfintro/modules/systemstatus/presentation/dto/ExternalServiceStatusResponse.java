package com.selfintro.modules.systemstatus.presentation.dto;

public record ExternalServiceStatusResponse(
        String name, String indicator, String description, String url) {}
