package com.solchall.todai.api.elder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;

public record ElderWeeklyAnalysisRequest(
        @JsonProperty("elder_id")
        Long elderId,
        LocalDate date
) {
}
