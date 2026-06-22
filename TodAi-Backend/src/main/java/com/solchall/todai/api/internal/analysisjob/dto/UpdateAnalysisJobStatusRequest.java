package com.solchall.todai.api.internal.analysisjob.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

public record UpdateAnalysisJobStatusRequest(
        String status,
        @JsonProperty("correlation_id")
        String correlationId,
        String message,
        @JsonProperty("error_reason")
        String errorReason,
        @JsonProperty("finished_at")
        LocalDateTime finishedAt
) {
}
