package com.solchall.todai.domain.analysisjob.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "analysis_job_event",
        indexes = {
                @Index(name = "idx_analysis_job_event_job_id", columnList = "analysis_job_id"),
                @Index(name = "idx_analysis_job_event_correlation_id", columnList = "correlation_id")
        }
)
public class AnalysisJobEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "analysis_job_id", nullable = false)
    private AnalysisJob analysisJob;

    @Column(name = "correlation_id", length = 255)
    private String correlationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "worker_type", length = 50)
    private WorkerType workerType;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private AnalysisJobEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_status", length = 50)
    private EventStatus eventStatus;

    @Column(name = "queue_name", length = 255)
    private String queueName;

    @Column(name = "routing_key", length = 255)
    private String routingKey;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "error_reason", columnDefinition = "TEXT")
    private String errorReason;

    @Column(name = "payload_json", columnDefinition = "TEXT")
    private String payloadJson;

    @Column(name = "occurred_at")
    private LocalDateTime occurredAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected AnalysisJobEvent() {
    }

    public AnalysisJobEvent(
            AnalysisJob analysisJob,
            String correlationId,
            WorkerType workerType,
            AnalysisJobEventType eventType,
            EventStatus eventStatus,
            String queueName,
            String routingKey,
            String message,
            String errorReason,
            String payloadJson,
            LocalDateTime occurredAt
    ) {
        this.analysisJob = analysisJob;
        this.correlationId = correlationId;
        this.workerType = workerType;
        this.eventType = eventType;
        this.eventStatus = eventStatus;
        this.queueName = queueName;
        this.routingKey = routingKey;
        this.message = message;
        this.errorReason = errorReason;
        this.payloadJson = payloadJson;
        this.occurredAt = occurredAt;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public AnalysisJob getAnalysisJob() {
        return analysisJob;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public WorkerType getWorkerType() {
        return workerType;
    }

    public AnalysisJobEventType getEventType() {
        return eventType;
    }

    public EventStatus getEventStatus() {
        return eventStatus;
    }

    public String getQueueName() {
        return queueName;
    }

    public String getRoutingKey() {
        return routingKey;
    }

    public String getMessage() {
        return message;
    }

    public String getErrorReason() {
        return errorReason;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public LocalDateTime getOccurredAt() {
        return occurredAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
