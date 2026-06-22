package com.solchall.todai.api.elder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;

public record WeeklySummaryDto(
        LocalDate date,
        @JsonProperty("summary_text")
        String summaryText
) {
}
