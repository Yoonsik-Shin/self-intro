package com.selfintro.modules.visitor.presentation.dto;

import java.time.LocalDate;

public record VisitorDailyResponse(LocalDate date, long visitors, long pageViews) {}
