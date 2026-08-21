package com.h.hiveboard.backend.model;

// Global account role. Board-level role (Admin/Member/Viewer per workspace)
// will be a separate entity later (Phase 4) — this one is just for the account itself.
public enum Role {
    USER,
    ADMIN
}
