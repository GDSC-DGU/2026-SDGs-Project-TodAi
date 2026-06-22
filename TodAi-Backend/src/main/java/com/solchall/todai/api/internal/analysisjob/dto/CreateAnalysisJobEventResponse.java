package com.solchall.todai.api.internal.analysisjob.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

public record CreateAnalysisJobEventResponse(
        @JsonProperty("event_id")
        Long eventId,
        @JsonProperty("job_id")
        String jobId,
        @JsonProperty("event_type")
        String eventType,
        @JsonProperty("created_at")
        LocalDateTime createdAt
) {
}
