package com.h.hiveboard.backend.invitation.controller;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.invitation.dto.InvitationDtos.AcceptInvitationResponse;
import com.h.hiveboard.backend.invitation.dto.InvitationDtos.CreateInvitationRequest;
import com.h.hiveboard.backend.invitation.dto.InvitationDtos.InvitationPreviewResponse;
import com.h.hiveboard.backend.invitation.dto.InvitationDtos.InvitationResponse;
import com.h.hiveboard.backend.invitation.service.InvitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;

    // Admin: invite someone by email
    @PostMapping("/api/boards/{boardId}/invitations")
    public ResponseEntity<InvitationResponse> create(@AuthenticationPrincipal User user,
                                                     @PathVariable UUID boardId,
                                                     @Valid @RequestBody CreateInvitationRequest request) {
        return ResponseEntity.ok(invitationService.createInvitation(boardId, user, request));
    }

    // Admin: pending invitations
    @GetMapping("/api/boards/{boardId}/invitations")
    public ResponseEntity<List<InvitationResponse>> pending(@AuthenticationPrincipal User user,
                                                            @PathVariable UUID boardId) {
        return ResponseEntity.ok(invitationService.getPendingInvitations(boardId, user));
    }

    // Admin: revoke a pending invitation
    @DeleteMapping("/api/invitations/{invitationId}")
    public ResponseEntity<Void> revoke(@AuthenticationPrincipal User user, @PathVariable UUID invitationId) {
        invitationService.revokeInvitation(invitationId, user);
        return ResponseEntity.noContent().build();
    }

    // Invitee (logged in): what am I being invited to?
    @GetMapping("/api/invitations/{token}")
    public ResponseEntity<InvitationPreviewResponse> preview(@AuthenticationPrincipal User user,
                                                             @PathVariable String token) {
        return ResponseEntity.ok(invitationService.preview(token, user));
    }

    // Invitee (logged in, matching email): join the board
    @PostMapping("/api/invitations/{token}/accept")
    public ResponseEntity<AcceptInvitationResponse> accept(@AuthenticationPrincipal User user,
                                                           @PathVariable String token) {
        return ResponseEntity.ok(invitationService.accept(token, user));
    }
}
