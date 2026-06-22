package com.solchall.todai.domain.analysis.entity;

import java.util.Arrays;

public enum AdkStatus {
    PENDING,
    SUCCESS,
    FAILED,
    SKIPPED;

    public static AdkStatus fromExternalValue(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("adk_status 값이 비어 있습니다.");
        }

        return Arrays.stream(values())
                .filter(status -> status.name().equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("지원하지 않는 adk_status 입니다: " + value));
    }
}
