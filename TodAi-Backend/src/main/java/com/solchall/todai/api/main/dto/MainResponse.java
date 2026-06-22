package com.solchall.todai.api.main.dto;

import java.util.List;

public record MainResponse(List<MainElderResponse> data) {

    public static MainResponse from(List<MainElderResponse> data) {
        return new MainResponse(List.copyOf(data));
    }
}
