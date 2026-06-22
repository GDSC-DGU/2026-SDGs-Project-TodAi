package com.solchall.todai.api.elder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;

public record MonthlyDataDto(
        LocalDate date,
        String day,
        Integer score,
        @JsonProperty("conv_time")
        Integer convTime
) {
}
