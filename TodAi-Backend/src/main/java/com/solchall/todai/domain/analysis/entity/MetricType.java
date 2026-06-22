package com.solchall.todai.domain.analysis.entity;

import java.util.Arrays;

public enum MetricType {
    SOCIAL_ISOLATION("사회적 고립", "social_isolation"),
    HEALTH_ANXIETY("건강 불안", "health_anxiety"),
    DAILY_VITALITY("일상 활력", "daily_vitality"),
    EMOTIONAL_VARIATION("감정 변동성", "emotion_variance"),
    COGNITIVE_DECLINE("인지 저하", "cognitive_load");

    private final String displayName;
    private final String externalFieldName;

    MetricType(String displayName, String externalFieldName) {
        this.displayName = displayName;
        this.externalFieldName = externalFieldName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getExternalFieldName() {
        return externalFieldName;
    }

    public static MetricType fromExternalField(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("metric field 값이 비어 있습니다.");
        }

        return Arrays.stream(values())
                .filter(metricType -> metricType.externalFieldName.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("지원하지 않는 metric field 입니다: " + value));
    }
}
