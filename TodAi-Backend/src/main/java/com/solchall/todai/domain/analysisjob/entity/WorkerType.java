package com.solchall.todai.domain.analysisjob.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;

public enum WorkerType {
    emotion,
    stt,
    adk,
    aggregator,
    system;

    @JsonCreator
    public static WorkerType from(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return Arrays.stream(values())
                .filter(workerType -> workerType.name().equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("지원하지 않는 worker_type 입니다: " + value));
    }
}
