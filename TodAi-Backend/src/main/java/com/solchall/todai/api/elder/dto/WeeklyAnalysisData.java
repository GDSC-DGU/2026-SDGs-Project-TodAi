package com.solchall.todai.api.elder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record WeeklyAnalysisData(
        @JsonProperty("weekly_data")
        List<WeeklyDataDto> weeklyData,
        @JsonProperty("weekly_scores_radar")
        List<WeeklyRadarScoreDto> weeklyScoresRadar,
        List<WeeklySummaryDto> summaries
) {

    public static WeeklyAnalysisData of(
            List<WeeklyDataDto> weeklyData,
            List<WeeklyRadarScoreDto> weeklyScoresRadar,
            List<WeeklySummaryDto> summaries
    ) {
        return new WeeklyAnalysisData(
                List.copyOf(weeklyData),
                List.copyOf(weeklyScoresRadar),
                List.copyOf(summaries)
        );
    }
}
