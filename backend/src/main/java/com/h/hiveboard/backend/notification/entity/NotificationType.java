package com.h.hiveboard.backend.notification.entity;

public enum NotificationType {
    CARD_ASSIGNED,   // you were assigned to a card
    CARD_FLAGGED,    // a card assigned to you was flagged high priority
    COMMENT_REPLY,   // someone replied to your comment
    COMMENT_MENTION, // someone @mentioned you in a comment
    MEMBER_JOINED,   // someone joined a board you're on
    MEMBER_LEFT,     // someone left a board you're on
    MEMBER_REMOVED   // an admin removed you from a board
}
