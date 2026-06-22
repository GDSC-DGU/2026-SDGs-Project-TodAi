package com.solchall.todai.api.elder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record MonthlyAnalysisData(
        @JsonProperty("monthly_data")
        List<MonthlyDataDto> monthlyData,
        @JsonProperty("weekly_scores")
        List<WeeklyScoreDto> weeklyScores,
        @JsonProperty("weekly_conv_time")
        List<WeeklyConvTimeDto> weeklyConvTime,
        @JsonProperty("monthly_summaries")
        List<MonthlySummaryDto> monthlySummaries
) {

    public static MonthlyAnalysisData of(
            List<MonthlyDataDto> monthlyData,
            List<WeeklyScoreDto> weeklyScores,
            List<WeeklyConvTimeDto> weeklyConvTime,
            List<MonthlySummaryDto> monthlySummaries
    ) {
        return new MonthlyAnalysisData(
                List.copyOf(monthlyData),
                List.copyOf(weeklyScores),
                List.copyOf(weeklyConvTime),
                List.copyOf(monthlySummaries)
        );
    }
}
