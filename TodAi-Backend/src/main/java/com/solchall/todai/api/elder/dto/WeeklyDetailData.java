package com.solchall.todai.api.elder.dto;

import java.util.List;

public record WeeklyDetailData(List<WeeklyGuideDto> guides) {

    public static WeeklyDetailData of(List<WeeklyGuideDto> guides) {
        return new WeeklyDetailData(List.copyOf(guides));
    }
}
