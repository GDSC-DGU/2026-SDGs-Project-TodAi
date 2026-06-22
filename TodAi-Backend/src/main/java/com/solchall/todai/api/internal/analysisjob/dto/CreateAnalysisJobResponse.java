package com.solchall.todai.api.internal.analysisjob.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CreateAnalysisJobResponse(
        @JsonProperty("job_id")
        String jobId,
        String status
) {
}
