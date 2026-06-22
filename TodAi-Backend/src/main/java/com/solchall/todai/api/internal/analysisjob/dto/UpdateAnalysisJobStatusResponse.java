package com.solchall.todai.api.internal.analysisjob.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

public record UpdateAnalysisJobStatusResponse(
        @JsonProperty("job_id")
        String jobId,
        String status,
        @JsonProperty("updated_at")
        LocalDateTime updatedAt
) {
}
