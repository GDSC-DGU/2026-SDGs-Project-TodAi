package com.solchall.todai.api.elder.dto;

import java.math.BigDecimal;

public record DailyScoreDto(
        String type,
        String name,
        BigDecimal score
) {
}
