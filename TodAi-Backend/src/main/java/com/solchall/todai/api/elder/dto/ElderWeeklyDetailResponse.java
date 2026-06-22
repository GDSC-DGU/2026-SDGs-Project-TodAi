package com.solchall.todai.api.elder.dto;

public record ElderWeeklyDetailResponse(WeeklyDetailData data) {

    public static ElderWeeklyDetailResponse from(WeeklyDetailData data) {
        return new ElderWeeklyDetailResponse(data);
    }
}
