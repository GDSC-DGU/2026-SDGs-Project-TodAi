package com.solchall.todai.domain.conversation.repository;

import com.solchall.todai.domain.conversation.entity.ConversationMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConversationMessageRepository extends JpaRepository<ConversationMessage, Long> {

    List<ConversationMessage> findByConversationSessionIdOrderByMessageOrderAsc(Long conversationSessionId);
}
