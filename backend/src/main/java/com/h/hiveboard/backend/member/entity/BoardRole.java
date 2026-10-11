package com.h.hiveboard.backend.member.entity;

// A user's role on ONE board (stored on BoardMember). Not to be confused with
// auth.entity.Role, which is the global account role (USER/ADMIN).
//
// Declared lowest -> highest so roles can be compared by rank.
public enum BoardRole {
    VIEWER,  // read everything
    MEMBER,  // + create/edit cards, lists, labels and comments
    ADMIN;   // + edit/delete the board, manage members and invitations

    public boolean isAtLeast(BoardRole required) {
        return this.ordinal() >= required.ordinal();
    }
}
