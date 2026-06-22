package com.solchall.todai.api.internal.analysisjob.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.solchall.todai.domain.analysisjob.entity.AnalysisJobEventType;
import com.solchall.todai.domain.analysisjob.entity.EventStatus;
import com.solchall.todai.domain.analysisjob.entity.WorkerType;

import java.time.LocalDateTime;

public record CreateAnalysisJobEventRequest(
        @JsonProperty("event_type")
        AnalysisJobEventType eventType,
        @JsonProperty("worker_type")
        WorkerType workerType,
        @JsonProperty("correlation_id")
        String correlationId,
        @JsonProperty("event_status")
        EventStatus eventStatus,
        @JsonProperty("queue_name")
        String queueName,
        @JsonProperty("routing_key")
        String routingKey,
        String message,
        @JsonProperty("error_reason")
        String errorReason,
        @JsonProperty("payload_json")
        String payloadJson,
        @JsonProperty("occurred_at")
        LocalDateTime occurredAt
) {
}
