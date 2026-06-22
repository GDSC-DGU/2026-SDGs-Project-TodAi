package com.solchall.todai.api.elder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record WeeklyConvTimeDto(
        Integer week,
        @JsonProperty("conv_time")
        Integer convTime
) {
}
