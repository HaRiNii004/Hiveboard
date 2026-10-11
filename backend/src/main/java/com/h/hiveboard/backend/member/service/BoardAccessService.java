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

        if (!member.getRole().isAtLeast(required)) {
            throw new ForbiddenOperationException(
                    "Your role on this board (" + member.getRole() + ") doesn't allow this");
        }
        return member;
    }

    public Board requireRole(UUID boardId, User user, BoardRole required) {
        return requireMembership(boardId, user, required).getBoard();
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
