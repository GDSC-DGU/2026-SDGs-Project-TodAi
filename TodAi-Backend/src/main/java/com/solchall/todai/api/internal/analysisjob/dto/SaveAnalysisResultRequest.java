package com.solchall.todai.api.internal.analysisjob.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public record SaveAnalysisResultRequest(
        @JsonProperty("session_id")
        String sessionId,
        @JsonProperty("elder_id")
        String elderId,
        @JsonProperty("correlation_id")
        String correlationId,
        @JsonProperty("job_status")
        String jobStatus,
        @JsonProperty("analysis_status")
        String analysisStatus,
        @JsonProperty("adk_status")
        String adkStatus,
        @JsonProperty("stt_text")
        String sttText,
        MetricPayload metrics,
        @JsonProperty("summary_text")
        String summaryText,
        @JsonProperty("overall_score")
        BigDecimal overallScore,
        @JsonProperty("error_reason")
        String errorReason,
        @JsonProperty("adk_error_reason")
        String adkErrorReason
) {
}
