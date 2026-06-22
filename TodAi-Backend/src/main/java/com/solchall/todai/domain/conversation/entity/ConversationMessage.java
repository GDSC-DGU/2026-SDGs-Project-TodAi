package com.solchall.todai.domain.conversation.entity;

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
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "conversation_message")
public class ConversationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_session_id", nullable = false)
    private ConversationSession conversationSession;

    @Enumerated(EnumType.STRING)
    @Column(name = "speaker_type", nullable = false, length = 50)
    private SpeakerType speakerType;

    @Column(name = "speaker_name", length = 100)
    private String speakerName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "message_order")
    private Integer messageOrder;

    @Column(name = "spoken_at")
    private LocalDateTime spokenAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    protected ConversationMessage() {
    }

    public ConversationMessage(
            ConversationSession conversationSession,
            SpeakerType speakerType,
            String speakerName,
            String content,
            Integer messageOrder,
            LocalDateTime spokenAt
    ) {
        this.conversationSession = conversationSession;
        this.speakerType = speakerType;
        this.speakerName = speakerName;
        this.content = content;
        this.messageOrder = messageOrder;
        this.spokenAt = spokenAt;
    }

    public Long getId() {
        return id;
    }

    public ConversationSession getConversationSession() {
        return conversationSession;
    }

    public SpeakerType getSpeakerType() {
        return speakerType;
    }

    public String getSpeakerName() {
        return speakerName;
    }

    public String getContent() {
        return content;
    }

    public Integer getMessageOrder() {
        return messageOrder;
    }

    public LocalDateTime getSpokenAt() {
        return spokenAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
