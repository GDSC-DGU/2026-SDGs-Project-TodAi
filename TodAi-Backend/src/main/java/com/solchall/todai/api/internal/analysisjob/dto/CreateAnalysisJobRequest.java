package com.solchall.todai.api.internal.analysisjob.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record CreateAnalysisJobRequest(
        @JsonProperty("session_id")
        String sessionId,
        @JsonProperty("elder_id")
        String elderId,
        @JsonProperty("correlation_id")
        String correlationId,
        @JsonProperty("requested_workers")
        List<String> requestedWorkers
) {
}
