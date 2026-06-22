package com.solchall.todai.domain.analysisjob.entity;

import java.util.Locale;

public enum AnalysisJobStatus {
    PENDING,
    PUBLISHED,
    PROCESSING,
    COMPLETED,
    PARTIAL_FAILED,
    FAILED,
    PARTIAL_TIMEOUT,
    TIMEOUT,
    DEAD_LETTER;

    public static AnalysisJobStatus fromExternalStatus(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("status 값이 비어 있습니다.");
        }

        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "pending" -> PENDING;
            case "published" -> PUBLISHED;
            case "processing" -> PROCESSING;
            case "completed" -> COMPLETED;
            case "partial_failed" -> PARTIAL_FAILED;
            case "failed" -> FAILED;
            case "partial_timeout" -> PARTIAL_TIMEOUT;
            case "timeout" -> TIMEOUT;
            case "dead_letter" -> DEAD_LETTER;
            default -> throw new IllegalArgumentException("지원하지 않는 status 입니다: " + value);
        };
    }
}
