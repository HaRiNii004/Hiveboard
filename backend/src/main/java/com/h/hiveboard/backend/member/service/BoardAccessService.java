package com.h.hiveboard.backend.member.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.exception.ForbiddenOperationException;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
import com.h.hiveboard.backend.member.entity.BoardMember;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.repository.BoardMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

// The single source of truth for "may this user do this on this board?".
// Every service (boards, lists, cards, labels, comments, members, invitations)
// goes through here, directly or via the board a list/card/label belongs to.
@Service
@RequiredArgsConstructor
public class BoardAccessService {

    private final BoardMemberRepository boardMemberRepository;

    // Returns the caller's membership if their role is at least `required`.
    //  - not a member  -> 404, so outsiders can't even tell the board exists
    //  - role too low  -> 403
    public BoardMember requireMembership(UUID boardId, User user, BoardRole required) {
        BoardMember member = boardMemberRepository.findByBoardIdAndUserId(boardId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No board with id " + boardId));

        requireRoleOf(member, required);
        return member;
    }

    // 403 if this membership's role is below `required`.
    public void requireRoleOf(BoardMember member, BoardRole required) {
        if (!member.getRole().isAtLeast(required)) {
            throw new ForbiddenOperationException(
                    "Your role on this board (" + member.getRole() + ") doesn't allow this");
        }
    }

    public Board requireRole(UUID boardId, User user, BoardRole required) {
        return requireMembership(boardId, user, required).getBoard();
    }

    // The user behind a membership, for assigning cards. Only board members can be assigned.
    public User requireMemberUser(UUID boardId, Long userId) {
        return boardMemberRepository.findByBoardIdAndUserId(boardId, userId)
                .map(BoardMember::getUser)
                .orElseThrow(() -> new IllegalArgumentException("Cards can only be assigned to members of this board"));
    }

    public BoardMember addMember(Board board, User user, BoardRole role) {
        BoardMember member = BoardMember.builder()
                .board(board)
                .user(user)
                .role(role)
                .build();
        return boardMemberRepository.saveAndFlush(member);
    }
}
