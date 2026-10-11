package com.h.hiveboard.backend.invitation.entity;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.member.entity.BoardRole;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

// A pending offer to join a board. The raw token only ever exists in the
// invite link; we store its SHA-256 hash, so a leaked database can't be
// used to accept invitations.
@Entity
@Table(name = "invitations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Invitation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    // Stored lower-cased; the accepting user's email must match it.
    @Column(nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BoardRole role;

    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvitationStatus status;

    @Column(nullable = false)
    private Instant expiresAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by_id", nullable = false)
    private User invitedBy;

    @CreationTimestamp
    private Instant createdAt;

    private Instant acceptedAt;

    // PENDING but past its expiry date counts as expired.
    public boolean isUsable() {
        return status == InvitationStatus.PENDING && expiresAt.isAfter(Instant.now());
    }
}
