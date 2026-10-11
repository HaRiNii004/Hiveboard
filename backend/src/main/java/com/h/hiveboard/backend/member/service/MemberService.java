package com.h.hiveboard.backend.member.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.exception.ForbiddenOperationException;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
import com.h.hiveboard.backend.member.dto.MemberDtos.MemberResponse;
import com.h.hiveboard.backend.member.dto.MemberDtos.UpdateMemberRoleRequest;
import com.h.hiveboard.backend.member.entity.BoardMember;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.repository.BoardMemberRepository;
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
        return MemberResponse.from(target);
    }

    // Admins can remove anyone; everyone can remove themselves (leave the board).
    // Their cards and comments stay on the board, still attributed to them.
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
