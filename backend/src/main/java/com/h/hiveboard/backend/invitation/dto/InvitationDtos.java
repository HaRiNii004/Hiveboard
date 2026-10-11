package com.h.hiveboard.backend.invitation.dto;

import com.h.hiveboard.backend.invitation.entity.Invitation;
import com.h.hiveboard.backend.invitation.entity.InvitationStatus;
import com.h.hiveboard.backend.member.entity.BoardRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

public class InvitationDtos {

    public record CreateInvitationRequest(@NotBlank @Email String email, @NotNull BoardRole role) {}

    // inviteUrl is only filled in right after creating: we never store the raw
    // token, so the link can't be shown again later (revoke + re-invite instead).
    public record InvitationResponse(UUID id, String email, BoardRole role, InvitationStatus status,
                                     Instant expiresAt, String invitedByName, Instant createdAt,
                                     String inviteUrl) {
        public static InvitationResponse from(Invitation invitation, String inviteUrl) {
            return new InvitationResponse(invitation.getId(), invitation.getEmail(), invitation.getRole(),
                    invitation.getStatus(), invitation.getExpiresAt(), invitation.getInvitedBy().getFullName(),
                    invitation.getCreatedAt(), inviteUrl);
        }
    }

    // What the invite page shows before accepting. boardId is only included once
    // the viewer is a member, so the link alone doesn't reveal it.
    public record InvitationPreviewResponse(String boardName, BoardRole role, String invitedByName,
                                            String email, InvitationStatus status, Instant expiresAt,
                                            boolean emailMatches, boolean alreadyMember, UUID boardId) {}

    public record AcceptInvitationResponse(UUID boardId, BoardRole role) {}
}
