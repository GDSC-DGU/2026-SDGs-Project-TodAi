package com.solchall.todai.domain.analysisjob.entity;

import com.solchall.todai.domain.analysis.entity.AnalysisResult;
import com.solchall.todai.domain.conversation.entity.ConversationSession;
import com.solchall.todai.domain.elder.entity.Elder;
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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "analysis_job",
        indexes = {
                @Index(name = "idx_analysis_job_status_created_at", columnList = "status, created_at"),
                @Index(name = "idx_analysis_job_conversation_session_id", columnList = "conversation_session_id"),
                @Index(name = "idx_analysis_job_elder_id", columnList = "elder_id"),
                @Index(name = "idx_analysis_job_analysis_result_id", columnList = "analysis_result_id"),
                @Index(name = "idx_analysis_job_correlation_id", columnList = "correlation_id")
        }
)
public class AnalysisJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_type", nullable = false, length = 50)
    private AnalysisJobType jobType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "elder_id")
    private Elder elder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_session_id")
    private ConversationSession conversationSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_result_id")
    private AnalysisResult analysisResult;

    @Column(name = "session_key", nullable = false, length = 255)
    private String sessionKey;

    @Column(name = "correlation_id", nullable = false, unique = true, length = 255)
    private String correlationId;

    @Column(name = "request_id", length = 100)
    private String requestId;

    @Column(name = "queue_name", length = 100)
    private String queueName;

    @Column(name = "routing_key", length = 100)
    private String routingKey;

    @Column(name = "message_id", length = 100)
    private String messageId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AnalysisJobStatus status;

    @Column(name = "requested_workers", columnDefinition = "TEXT")
    private String requestedWorkers;

    @Column(name = "request_payload", columnDefinition = "TEXT")
    private String requestPayload;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Column(name = "error_reason", columnDefinition = "TEXT")
    private String errorReason;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount;

    @Column(name = "error_code", length = 50)
    private String errorCode;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected AnalysisJob() {
    }

    public AnalysisJob(
            AnalysisJobType jobType,
            Elder elder,
            ConversationSession conversationSession,
            AnalysisResult analysisResult,
            String sessionKey,
            String correlationId,
            String requestId,
            String queueName,
            String routingKey,
            String messageId,
            AnalysisJobStatus status,
            String requestedWorkers,
            String requestPayload
    ) {
        this.jobType = jobType;
        this.elder = elder;
        this.conversationSession = conversationSession;
        this.analysisResult = analysisResult;
        this.sessionKey = sessionKey;
        this.correlationId = correlationId;
        this.requestId = requestId;
        this.queueName = queueName;
        this.routingKey = routingKey;
        this.messageId = messageId;
        this.status = status;
        this.requestedWorkers = requestedWorkers;
        this.requestPayload = requestPayload;
        this.retryCount = 0;
    }

    public static AnalysisJob createInternalJob(
            Elder elder,
            ConversationSession conversationSession,
            String sessionKey,
            String correlationId,
            String requestedWorkers,
            String requestPayload
    ) {
        return new AnalysisJob(
                AnalysisJobType.CONVERSATION_ANALYSIS,
                elder,
                conversationSession,
                null,
                sessionKey,
                correlationId,
                null,
                null,
                null,
                null,
                AnalysisJobStatus.PENDING,
                requestedWorkers,
                requestPayload
        );
    }

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (retryCount == null) {
            retryCount = 0;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void attachAnalysisResult(AnalysisResult analysisResult) {
        this.analysisResult = analysisResult;
    }

    public void markPublished(LocalDateTime publishedAt) {
        this.status = AnalysisJobStatus.PUBLISHED;
        this.publishedAt = publishedAt;
        this.errorCode = null;
        this.errorMessage = null;
    }

    public void markProcessing(LocalDateTime startedAt) {
        this.status = AnalysisJobStatus.PROCESSING;
        if (this.startedAt == null) {
            this.startedAt = startedAt;
        }
        this.errorCode = null;
        this.errorMessage = null;
    }

    public void markSuccess(LocalDateTime finishedAt) {
        this.status = AnalysisJobStatus.COMPLETED;
        this.finishedAt = finishedAt;
        if (this.startedAt == null) {
            this.startedAt = finishedAt;
        }
        this.errorReason = null;
        this.errorCode = null;
        this.errorMessage = null;
    }

    public void markFailed(String errorCode, String errorMessage, LocalDateTime finishedAt) {
        this.status = AnalysisJobStatus.FAILED;
        this.finishedAt = finishedAt;
        this.errorReason = errorMessage;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        if (this.startedAt == null) {
            this.startedAt = finishedAt;
        }
    }

    public void markDeadLetter(String errorCode, String errorMessage, LocalDateTime finishedAt) {
        this.status = AnalysisJobStatus.DEAD_LETTER;
        this.finishedAt = finishedAt;
        this.errorReason = errorMessage;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
    }

    public void updateStatus(
            AnalysisJobStatus status,
            String message,
            String errorReason,
            LocalDateTime finishedAt
    ) {
        this.status = status;
        this.errorReason = errorReason;
        this.errorMessage = message;
        if (status == AnalysisJobStatus.PUBLISHED && this.publishedAt == null) {
            this.publishedAt = LocalDateTime.now();
        }
        if (status == AnalysisJobStatus.PROCESSING && this.startedAt == null) {
            this.startedAt = LocalDateTime.now();
        }
        if (finishedAt != null) {
            this.finishedAt = finishedAt;
            if (this.startedAt == null) {
                this.startedAt = finishedAt;
            }
        }
    }

    public void incrementRetryCount() {
        this.retryCount = this.retryCount == null ? 1 : this.retryCount + 1;
    }

    public Long getId() {
        return id;
    }

    public AnalysisJobType getJobType() {
        return jobType;
    }

    public Elder getElder() {
        return elder;
    }

    public ConversationSession getConversationSession() {
        return conversationSession;
    }

    public AnalysisResult getAnalysisResult() {
        return analysisResult;
    }

    public String getSessionKey() {
        return sessionKey;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public String getRequestId() {
        return requestId;
    }

    public String getQueueName() {
        return queueName;
    }

    public String getRoutingKey() {
        return routingKey;
    }

    public String getMessageId() {
        return messageId;
    }

    public AnalysisJobStatus getStatus() {
        return status;
    }

    public String getRequestedWorkers() {
        return requestedWorkers;
    }

    public String getRequestPayload() {
        return requestPayload;
    }

    public LocalDateTime getPublishedAt() {
        return publishedAt;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public LocalDateTime getFinishedAt() {
        return finishedAt;
    }

    public Integer getRetryCount() {
        return retryCount;
    }

    public String getErrorReason() {
        return errorReason;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
