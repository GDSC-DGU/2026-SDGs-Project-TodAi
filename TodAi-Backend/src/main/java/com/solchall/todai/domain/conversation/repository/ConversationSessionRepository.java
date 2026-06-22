package com.solchall.todai.domain.conversation.repository;

import com.solchall.todai.domain.conversation.entity.ConversationSession;
import com.solchall.todai.domain.conversation.entity.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ConversationSessionRepository extends JpaRepository<ConversationSession, Long> {

    Optional<ConversationSession> findBySessionKey(String sessionKey);

    Optional<ConversationSession> findFirstByElderIdAndStartedAtGreaterThanEqualAndStartedAtLessThanAndSessionStatusOrderByStartedAtDesc(
            Long elderId,
            LocalDateTime start,
            LocalDateTime end,
            SessionStatus status
    );

    Optional<ConversationSession> findFirstByElderIdAndStartedAtGreaterThanEqualAndStartedAtLessThanOrderByStartedAtDesc(
            Long elderId,
            LocalDateTime start,
            LocalDateTime end
    );

    List<ConversationSession> findByElderIdAndStartedAtGreaterThanEqualAndStartedAtLessThanAndSessionStatusInOrderByStartedAtAsc(
            Long elderId,
            LocalDateTime start,
            LocalDateTime end,
            Collection<SessionStatus> statuses
    );
}
