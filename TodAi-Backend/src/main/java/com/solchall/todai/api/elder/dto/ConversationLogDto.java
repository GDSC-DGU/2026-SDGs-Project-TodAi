package com.solchall.todai.api.elder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ConversationLogDto(
        @JsonProperty("message_id")
        String messageId,
        String content,
        String name
) {
}
