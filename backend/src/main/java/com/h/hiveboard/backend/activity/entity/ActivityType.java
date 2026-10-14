package com.h.hiveboard.backend.activity.entity;

// What kind of change an activity entry is about (the frontend picks an icon from it).
// Reordering cards or lists isn't recorded: it would bury everything else.
public enum ActivityType {
    BOARD_CREATED, BOARD_UPDATED,
    LIST_CREATED, LIST_RENAMED, LIST_DELETED, LIST_ARCHIVED, LIST_RESTORED,
    CARD_CREATED, CARD_DUPLICATED, CARD_RENAMED, CARD_DESCRIPTION, CARD_DUE_DATE, CARD_ASSIGNEE,
    CARD_LABELS, CARD_PRIORITY, CARD_VISIBILITY, CARD_MOVED, CARD_DELETED, CARD_ARCHIVED, CARD_RESTORED,
    COMMENT_ADDED,
    LABEL_CREATED, LABEL_UPDATED, LABEL_DELETED,
    MEMBER_JOINED, MEMBER_ROLE_CHANGED, MEMBER_REMOVED, MEMBER_LEFT
}
