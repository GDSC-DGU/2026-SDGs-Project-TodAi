package com.solchall.todai.api.elder.dto;

public record ElderDailyAnalysisResponse(DailyAnalysisData data) {

    public static ElderDailyAnalysisResponse from(DailyAnalysisData data) {
        return new ElderDailyAnalysisResponse(data);
    }
}
