package com.solchall.todai.domain.analysis.entity;

import java.util.Arrays;

public enum AnalysisStatus {
    PENDING,
    SUCCESS,
    FAILED,
    PARTIAL;

    public static AnalysisStatus fromExternalValue(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("analysis_status 값이 비어 있습니다.");
        }

        return Arrays.stream(values())
                .filter(status -> status.name().equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("지원하지 않는 analysis_status 입니다: " + value));
    }
}
