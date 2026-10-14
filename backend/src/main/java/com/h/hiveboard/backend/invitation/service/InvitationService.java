package com.h.hiveboard.backend.invitation.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.exception.ForbiddenOperationException;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
import com.h.hiveboard.backend.invitation.dto.InvitationDtos.AcceptInvitationResponse;
import com.h.hiveboard.backend.invitation.dto.InvitationDtos.CreateInvitationRequest;
import com.h.hiveboard.backend.invitation.dto.InvitationDtos.InvitationPreviewResponse;
import com.h.hiveboard.backend.invitation.dto.InvitationDtos.InvitationResponse;
import com.h.hiveboard.backend.invitation.entity.Invitation;
import com.h.hiveboard.backend.invitation.entity.InvitationStatus;
import com.h.hiveboard.backend.invitation.repository.InvitationRepository;
import com.h.hiveboard.backend.member.entity.BoardMember;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.repository.BoardMemberRepository;
import com.h.hiveboard.backend.member.service.BoardAccessService;
import com.h.hiveboard.backend.notification.service.NotificationService;
import com.h.hiveboard.backend.activity.entity.ActivityType;
import com.h.hiveboard.backend.activity.service.ActivityRecorder;
import com.h.hiveboard.backend.realtime.service.BoardEventPublisher;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.MemberPayload;
import com.h.hiveboard.backend.member.dto.MemberDtos.MemberResponse;
import com.h.hiveboard.backend.util.SecureTokens;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvitationService {

    private static final Duration INVITE_VALID_FOR = Duration.ofDays(7);

    private final InvitationRepository invitationRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final BoardAccessService boardAccessService;
    private final NotificationService notificationService;
    private final BoardEventPublisher boardEventPublisher;
    private final ActivityRecorder activityRecorder;         // the board's history

    // Where the frontend lives, for building invite links.
    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    // --- Admin side ---

    @Transactional
    public InvitationResponse createInvitation(UUID boardId, User user, CreateInvitationRequest request) {
        Board board = boardAccessService.requireRole(boardId, user, BoardRole.ADMIN);
        String email = normalize(request.email());

        if (boardMemberRepository.existsByBoardIdAndUserEmailIgnoreCase(boardId, email)) {
            throw new IllegalArgumentException(email + " is already a member of this board");
        }

        // One live invite per (board, email); stale ones get marked expired on the way.
        for (Invitation existing : invitationRepository.findByBoardIdAndEmailAndStatus(boardId, email, InvitationStatus.PENDING)) {
            if (existing.isUsable()) {
                throw new IllegalArgumentException(email + " already has a pending invitation. "
                        + "Revoke it first if you want to send a new one.");
            }
            existing.setStatus(InvitationStatus.EXPIRED);
        }

        String token = SecureTokens.newToken();
        Invitation invitation = Invitation.builder()
                .board(board)
                .email(email)
                .role(request.role())
                .tokenHash(SecureTokens.hash(token))
                .status(InvitationStatus.PENDING)
                .expiresAt(Instant.now().plus(INVITE_VALID_FOR))
                .invitedBy(user)
                .build();
        invitationRepository.saveAndFlush(invitation);

        // No email delivery yet: log the link so it can be copied during development.
        String inviteUrl = frontendUrl + "/invite/" + token;
        log.info("Invitation to board \"{}\" for {} as {}: {}", board.getName(), email, request.role(), inviteUrl);

        return InvitationResponse.from(invitation, inviteUrl);
    }

    @Transactional
    public List<InvitationResponse> getPendingInvitations(UUID boardId, User user) {
        boardAccessService.requireRole(boardId, user, BoardRole.ADMIN);
        return invitationRepository.findByBoardIdAndStatusOrderByCreatedAtDesc(boardId, InvitationStatus.PENDING)
                .stream()
                .filter(this::stillUsable)
                .map(invitation -> InvitationResponse.from(invitation, null))
                .toList();
    }

    @Transactional
    public void revokeInvitation(UUID invitationId, User user) {
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("No invitation with id " + invitationId));
        boardAccessService.requireRole(invitation.getBoard().getId(), user, BoardRole.ADMIN);

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new IllegalArgumentException("Only pending invitations can be revoked");
        }
        invitation.setStatus(InvitationStatus.REVOKED);
    }

    // --- Invitee side ---

    @Transactional
    public InvitationPreviewResponse preview(String token, User user) {
        Invitation invitation = findByToken(token);
        stillUsable(invitation);

        Optional<BoardMember> membership =
                boardMemberRepository.findByBoardIdAndUserId(invitation.getBoard().getId(), user.getId());

        return new InvitationPreviewResponse(
                invitation.getBoard().getName(),
                invitation.getRole(),
                invitation.getInvitedBy().getFullName(),
                invitation.getEmail(),
                invitation.getStatus(),
                invitation.getExpiresAt(),
                emailMatches(invitation, user),
                membership.isPresent(),
                membership.map(m -> invitation.getBoard().getId()).orElse(null));
    }

    @Transactional
    public AcceptInvitationResponse accept(String token, User user) {
        Invitation invitation = findByToken(token);
        UUID boardId = invitation.getBoard().getId();
        Optional<BoardMember> membership = boardMemberRepository.findByBoardIdAndUserId(boardId, user.getId());

        if (!emailMatches(invitation, user)) {
            throw new ForbiddenOperationException("This invitation was sent to " + invitation.getEmail()
                    + ". Log in with that email to accept it.");
        }

        // Clicking the link twice is harmless once you've joined
        if (invitation.getStatus() == InvitationStatus.ACCEPTED && membership.isPresent()) {
            return new AcceptInvitationResponse(boardId, membership.get().getRole());
        }

        if (!stillUsable(invitation)) {
            throw new IllegalArgumentException(switch (invitation.getStatus()) {
                case REVOKED -> "This invitation has been revoked";
                case ACCEPTED -> "This invitation has already been used";
                default -> "This invitation has expired. Ask a board admin for a new one.";
            });
        }

        // Already a member some other way: keep their current role
        BoardMember member = membership.orElseGet(() -> {
            BoardMember joined = boardAccessService.addMember(invitation.getBoard(), user, invitation.getRole());
            notificationService.memberJoined(invitation.getBoard(), user);
            activityRecorder.board(invitation.getBoard(), user, ActivityType.MEMBER_JOINED,
                    "joined the board as " + ActivityRecorder.role(invitation.getRole()));
            boardEventPublisher.publish(boardId, "MEMBER_ADDED", user, new MemberPayload(MemberResponse.from(joined)));
            return joined;
        });

        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitation.setAcceptedAt(Instant.now());
        return new AcceptInvitationResponse(boardId, member.getRole());
    }

    // --- helpers ---

    private Invitation findByToken(String token) {
        return invitationRepository.findByTokenHash(SecureTokens.hash(token))
                .orElseThrow(() -> new ResourceNotFoundException("This invitation link is invalid"));
    }

    // Marks a pending-but-past-expiry invitation as EXPIRED; returns whether it can still be used.
    private boolean stillUsable(Invitation invitation) {
        if (invitation.getStatus() == InvitationStatus.PENDING && !invitation.isUsable()) {
            invitation.setStatus(InvitationStatus.EXPIRED);
        }
        return invitation.isUsable();
    }

    private boolean emailMatches(Invitation invitation, User user) {
        return invitation.getEmail().equalsIgnoreCase(user.getEmail());
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
