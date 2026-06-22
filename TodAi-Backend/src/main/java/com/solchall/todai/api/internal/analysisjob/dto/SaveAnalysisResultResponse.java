package com.solchall.todai.api.internal.analysisjob.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

public record SaveAnalysisResultResponse(
        @JsonProperty("result_id")
        Long resultId,
        @JsonProperty("job_id")
        String jobId,
        @JsonProperty("analysis_status")
        String analysisStatus,
        @JsonProperty("adk_status")
        String adkStatus,
        @JsonProperty("saved_metric_count")
        int savedMetricCount,
        @JsonProperty("updated_at")
        LocalDateTime updatedAt
) {
}
