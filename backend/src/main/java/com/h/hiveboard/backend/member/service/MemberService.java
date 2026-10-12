package com.h.hiveboard.backend.member.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.card.repository.CardRepository;
import com.h.hiveboard.backend.exception.ForbiddenOperationException;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
import com.h.hiveboard.backend.member.dto.MemberDtos.MemberResponse;
import com.h.hiveboard.backend.member.dto.MemberDtos.UpdateMemberRoleRequest;
import com.h.hiveboard.backend.member.entity.BoardMember;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.repository.BoardMemberRepository;
import com.h.hiveboard.backend.notification.service.NotificationService;
import com.h.hiveboard.backend.realtime.service.BoardEventPublisher;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.MemberPayload;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.MemberRemovedPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final BoardMemberRepository boardMemberRepository;
    private final BoardAccessService boardAccessService;
    private final CardRepository cardRepository;
    private final NotificationService notificationService;
    private final BoardEventPublisher boardEventPublisher;

    @Transactional(readOnly = true)
    public List<MemberResponse> getMembers(UUID boardId, User user) {
        boardAccessService.requireMembership(boardId, user, BoardRole.VIEWER);
        return boardMemberRepository.findByBoardIdOrderByJoinedAtAsc(boardId)
                .stream()
                .map(MemberResponse::from)
                .toList();
    }

    @Transactional
    public MemberResponse changeRole(UUID boardId, Long targetUserId, User user, UpdateMemberRoleRequest request) {
        boardAccessService.requireMembership(boardId, user, BoardRole.ADMIN);
        BoardMember target = findMember(boardId, targetUserId);

        if (target.getRole() == BoardRole.ADMIN && request.role() != BoardRole.ADMIN) {
            ensureNotLastAdmin(boardId, "demote");
        }

        target.setRole(request.role());
        boardMemberRepository.save(target);
        MemberResponse response = MemberResponse.from(target);
        // The person whose role changed reloads the board (what they can see may change)
        boardEventPublisher.publish(boardId, "MEMBER_ROLE_CHANGED", user, new MemberPayload(response));
        return response;
    }

    // Admins can remove anyone; everyone can remove themselves (leave the board).
    // Their cards and comments stay on the board, still attributed to them, but
    // cards assigned to them become unassigned.
    @Transactional
    public void removeMember(UUID boardId, Long targetUserId, User user) {
        BoardMember caller = boardAccessService.requireMembership(boardId, user, BoardRole.VIEWER);
        boolean leaving = caller.getUser().getId().equals(targetUserId);

        if (!leaving && caller.getRole() != BoardRole.ADMIN) {
            throw new ForbiddenOperationException("Only admins can remove other members");
        }

        BoardMember target = leaving ? caller : findMember(boardId, targetUserId);
        if (target.getRole() == BoardRole.ADMIN) {
            ensureNotLastAdmin(boardId, leaving ? "leave as" : "remove");
        }

        cardRepository.unassignUserOnBoard(boardId, target.getUser().getId());
        if (leaving) {
            notificationService.memberLeft(caller.getBoard(), user);
        } else {
            notificationService.memberRemoved(caller.getBoard(), target.getUser(), user);
        }
        // Published before the delete so the removed person is still a recipient and their
        // board closes; after this they get nothing more from this board.
        boardEventPublisher.publish(boardId, "MEMBER_REMOVED", user,
                new MemberRemovedPayload(target.getUser().getId(), target.getUser().getFullName(), leaving));
        boardMemberRepository.delete(target);
    }

    private BoardMember findMember(UUID boardId, Long userId) {
        return boardMemberRepository.findByBoardIdAndUserId(boardId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("That user isn't a member of this board"));
    }

    // A board must always keep at least one admin.
    private void ensureNotLastAdmin(UUID boardId, String action) {
        if (boardMemberRepository.countByBoardIdAndRole(boardId, BoardRole.ADMIN) <= 1) {
            throw new IllegalArgumentException("Can't " + action + " the only admin of this board. "
                    + "Make someone else an admin first.");
        }
    }
}
