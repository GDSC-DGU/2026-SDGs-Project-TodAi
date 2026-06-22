package com.solchall.todai.api.elder.dto;

public record ElderMonthlyAnalysisResponse(MonthlyAnalysisData data) {

    public static ElderMonthlyAnalysisResponse from(MonthlyAnalysisData data) {
        return new ElderMonthlyAnalysisResponse(data);
    }
}
