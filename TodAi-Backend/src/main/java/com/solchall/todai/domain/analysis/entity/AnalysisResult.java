package com.solchall.todai.domain.analysis.entity;

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
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "analysis_result",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_analysis_result_job_id", columnNames = "analysis_job_id")
        }
)
public class AnalysisResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "elder_id")
    private Elder elder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_session_id", nullable = false)
    private ConversationSession conversationSession;

    @Column(name = "analysis_job_id")
    private Long analysisJobId;

    @Column(name = "session_key", length = 255)
    private String sessionKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_status", nullable = false, length = 50)
    private AnalysisStatus analysisStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "adk_status", length = 50)
    private AdkStatus adkStatus;

    @Column(name = "stt_text", columnDefinition = "TEXT")
    private String sttText;

    @Column(name = "overall_score", precision = 10, scale = 2)
    private BigDecimal overallScore;

    @Column(name = "summary_text", columnDefinition = "TEXT")
    private String summaryText;

    @Column(name = "error_reason", columnDefinition = "TEXT")
    private String errorReason;

    @Column(name = "adk_error_reason", columnDefinition = "TEXT")
    private String adkErrorReason;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    protected AnalysisResult() {
    }

    public AnalysisResult(
            Elder elder,
            ConversationSession conversationSession,
            Long analysisJobId,
            AnalysisStatus analysisStatus,
            BigDecimal overallScore,
            String summaryText
    ) {
        this.elder = elder;
        this.conversationSession = conversationSession;
        this.analysisJobId = analysisJobId;
        this.analysisStatus = analysisStatus;
        this.overallScore = overallScore;
        this.summaryText = summaryText;
        this.sessionKey = conversationSession != null ? conversationSession.getSessionKey() : null;
    }

    public static AnalysisResult create(
            Long analysisJobId,
            Elder elder,
            ConversationSession conversationSession,
            String sessionKey,
            AnalysisStatus analysisStatus,
            AdkStatus adkStatus,
            String sttText,
            String summaryText,
            BigDecimal overallScore,
            String errorReason,
            String adkErrorReason
    ) {
        AnalysisResult analysisResult = new AnalysisResult(
                elder,
                conversationSession,
                analysisJobId,
                analysisStatus,
                overallScore,
                summaryText
        );
        analysisResult.sessionKey = sessionKey;
        analysisResult.adkStatus = adkStatus;
        analysisResult.sttText = sttText;
        analysisResult.errorReason = errorReason;
        analysisResult.adkErrorReason = adkErrorReason;
        return analysisResult;
    }

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void updateAnalysisJobId(Long analysisJobId) {
        this.analysisJobId = analysisJobId;
    }

    public void updateResult(
            Elder elder,
            ConversationSession conversationSession,
            String sessionKey,
            AnalysisStatus analysisStatus,
            AdkStatus adkStatus,
            String sttText,
            String summaryText,
            BigDecimal overallScore,
            String errorReason,
            String adkErrorReason
    ) {
        this.elder = elder;
        this.conversationSession = conversationSession;
        this.sessionKey = sessionKey;
        this.analysisStatus = analysisStatus;
        this.adkStatus = adkStatus;
        this.sttText = sttText;
        this.summaryText = summaryText;
        this.overallScore = overallScore;
        this.errorReason = errorReason;
        this.adkErrorReason = adkErrorReason;
    }

    public void markSuccess(BigDecimal overallScore, String summaryText) {
        this.analysisStatus = AnalysisStatus.SUCCESS;
        this.overallScore = overallScore;
        this.summaryText = summaryText;
    }

    public void markFailed() {
        this.analysisStatus = AnalysisStatus.FAILED;
    }

    public void markPartial(BigDecimal overallScore, String summaryText) {
        this.analysisStatus = AnalysisStatus.PARTIAL;
        this.overallScore = overallScore;
        this.summaryText = summaryText;
    }

    public Long getId() {
        return id;
    }

    public Elder getElder() {
        return elder;
    }

    public ConversationSession getConversationSession() {
        return conversationSession;
    }

    public Long getAnalysisJobId() {
        return analysisJobId;
    }

    public String getSessionKey() {
        return sessionKey;
    }

    public AnalysisStatus getAnalysisStatus() {
        return analysisStatus;
    }

    public AdkStatus getAdkStatus() {
        return adkStatus;
    }

    public String getSttText() {
        return sttText;
    }

    public BigDecimal getOverallScore() {
        return overallScore;
    }

    public String getSummaryText() {
        return summaryText;
    }

    public String getErrorReason() {
        return errorReason;
    }

    public String getAdkErrorReason() {
        return adkErrorReason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
