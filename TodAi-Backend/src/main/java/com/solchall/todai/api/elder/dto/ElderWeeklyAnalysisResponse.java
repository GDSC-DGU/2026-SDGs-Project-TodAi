package com.solchall.todai.api.elder.dto;

public record ElderWeeklyAnalysisResponse(WeeklyAnalysisData data) {

    public static ElderWeeklyAnalysisResponse from(WeeklyAnalysisData data) {
        return new ElderWeeklyAnalysisResponse(data);
    }
}
