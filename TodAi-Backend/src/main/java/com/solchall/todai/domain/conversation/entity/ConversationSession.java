package com.solchall.todai.domain.conversation.entity;

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

import java.time.LocalDateTime;

@Entity
@Table(name = "conversation_session")
public class ConversationSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "elder_id")
    private Elder elder;

    @Column(name = "session_key", nullable = false, unique = true, length = 255)
    private String sessionKey;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "turn_count")
    private Integer turnCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_status", nullable = false, length = 50)
    private SessionStatus sessionStatus;

    @Column(name = "summary_text", columnDefinition = "TEXT")
    private String summaryText;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    protected ConversationSession() {
    }

    public static ConversationSession createInternalSession(Elder elder, String sessionKey) {
        return new ConversationSession(
                elder,
                sessionKey,
                null,
                null,
                null,
                null,
                SessionStatus.CREATED,
                null
        );
    }

    public ConversationSession(
            Elder elder,
            String sessionKey,
            LocalDateTime startedAt,
            LocalDateTime endedAt,
            Integer durationSeconds,
            Integer turnCount,
            SessionStatus sessionStatus,
            String summaryText
    ) {
        this.elder = elder;
        this.sessionKey = sessionKey;
        this.startedAt = startedAt;
        this.endedAt = endedAt;
        this.durationSeconds = durationSeconds;
        this.turnCount = turnCount;
        this.sessionStatus = sessionStatus;
        this.summaryText = summaryText;
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

    public void attachElder(Elder elder) {
        if (this.elder == null) {
            this.elder = elder;
        }
    }

    public Long getId() {
        return id;
    }

    public Elder getElder() {
        return elder;
    }

    public String getSessionKey() {
        return sessionKey;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public Integer getTurnCount() {
        return turnCount;
    }

    public SessionStatus getSessionStatus() {
        return sessionStatus;
    }

    public String getSummaryText() {
        return summaryText;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
