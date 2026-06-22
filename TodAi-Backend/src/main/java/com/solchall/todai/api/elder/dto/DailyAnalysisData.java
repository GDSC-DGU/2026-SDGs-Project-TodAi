package com.solchall.todai.api.elder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record DailyAnalysisData(
        TimelineDto timeline,
        @JsonProperty("conv_logs")
        List<ConversationLogDto> convLogs,
        @JsonProperty("summary_text")
        String summaryText,
        List<DailyScoreDto> score
) {

    public static DailyAnalysisData of(
            TimelineDto timeline,
            List<ConversationLogDto> convLogs,
            String summaryText,
            List<DailyScoreDto> score
    ) {
        return new DailyAnalysisData(
                timeline,
                List.copyOf(convLogs),
                summaryText,
                List.copyOf(score)
        );
    }
}
