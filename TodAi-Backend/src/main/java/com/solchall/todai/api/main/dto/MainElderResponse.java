package com.solchall.todai.api.main.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.solchall.todai.domain.elder.entity.ElderGender;
import com.solchall.todai.domain.elder.entity.ElderStatus;

import java.util.List;

public record MainElderResponse(
        @JsonProperty("elder_id")
        Long elderId,
        String name,
        Integer age,
        ElderGender gender,
        @JsonProperty("weekly_conv")
        Integer weeklyConv,
        List<MainScoreResponse> score,
        ElderStatus status
) {

    public static MainElderResponse of(
            Long elderId,
            String name,
            Integer age,
            ElderGender gender,
            int weeklyConv,
            List<MainScoreResponse> score,
            ElderStatus status
    ) {
        return new MainElderResponse(
                elderId,
                name,
                age,
                gender,
                weeklyConv,
                List.copyOf(score),
                status
        );
    }
}
