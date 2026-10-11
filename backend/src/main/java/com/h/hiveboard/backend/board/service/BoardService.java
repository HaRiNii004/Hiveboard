package com.h.hiveboard.backend.board.service;

import com.h.hiveboard.backend.board.dto.BoardDtos.CreateBoardRequest;
import com.h.hiveboard.backend.board.dto.BoardDtos.UpdateBoardRequest;
import com.h.hiveboard.backend.board.dto.BoardDtos.UpdateLabelsTitleRequest;
import com.h.hiveboard.backend.board.dto.BoardDtos.LabelsTitleResponse;
import com.h.hiveboard.backend.board.dto.BoardDtos.BoardSummaryResponse;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.BoardDetailResponse;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.ListResponse;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.CardResponse;
import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.boardlist.entity.BoardList;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.repository.BoardRepository;
import com.h.hiveboard.backend.label.dto.LabelDtos.LabelResponse;
import com.h.hiveboard.backend.member.entity.BoardMember;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.repository.BoardMemberRepository;
import com.h.hiveboard.backend.member.service.BoardAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BoardService {

    public static final String DEFAULT_LABELS_TITLE = "Labels";

    private final BoardRepository boardRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final BoardAccessService boardAccessService;

    // The creator becomes the board's first ADMIN; `owner` is kept as "created by".
    @Transactional
    public BoardSummaryResponse createBoard(User owner, CreateBoardRequest request) {
        Board board = Board.builder()
                .name(request.name())
                .description(request.description())
                .owner(owner)
                .build();

        boardRepository.save(board);
        boardAccessService.addMember(board, owner, BoardRole.ADMIN);
        return toSummary(board, BoardRole.ADMIN, owner);
    }

    // Every board I'm a member of — my own and ones shared with me — newest first.
    @Transactional(readOnly = true)
    public List<BoardSummaryResponse> getMyBoards(User user) {
        return boardMemberRepository.findByUserId(user.getId())
                .stream()
                .sorted(Comparator.comparing((BoardMember m) -> m.getBoard().getCreatedAt(),
                        Comparator.nullsLast(Comparator.<Instant>naturalOrder())).reversed())
                .map(m -> toSummary(m.getBoard(), m.getRole(), user))
                .toList();
    }

    @Transactional(readOnly = true)
    public BoardDetailResponse getBoardDetail(UUID boardId, User user) {
        BoardMember membership = boardAccessService.requireMembership(boardId, user, BoardRole.VIEWER);
        Board board = membership.getBoard();

        List<ListResponse> lists = board.getLists().stream()
                .map(this::toListResponse)
                .toList();

        List<LabelResponse> labels = board.getLabels().stream()
                .map(LabelResponse::from)
                .toList();

        return new BoardDetailResponse(board.getId(), board.getName(), board.getDescription(),
                labelsTitleOf(board), labels, lists, membership.getRole());
    }

    // Renaming the labels field is part of managing labels, which Members may do.
    @Transactional
    public LabelsTitleResponse updateLabelsTitle(UUID boardId, User user, UpdateLabelsTitleRequest request) {
        Board board = boardAccessService.requireRole(boardId, user, BoardRole.MEMBER);
        board.setLabelsTitle(request.labelsTitle().trim());
        boardRepository.save(board);
        return new LabelsTitleResponse(labelsTitleOf(board));
    }

    @Transactional
    public BoardSummaryResponse updateBoard(UUID boardId, User user, UpdateBoardRequest request) {
        Board board = boardAccessService.requireRole(boardId, user, BoardRole.ADMIN);
        board.setName(request.name());
        board.setDescription(request.description());
        boardRepository.save(board);
        return toSummary(board, BoardRole.ADMIN, user);
    }

    // Cascades to lists, cards, comments, labels, memberships and invitations.
    @Transactional
    public void deleteBoard(UUID boardId, User user) {
        Board board = boardAccessService.requireRole(boardId, user, BoardRole.ADMIN);
        boardRepository.delete(board);
    }

    private String labelsTitleOf(Board board) {
        return board.getLabelsTitle() != null ? board.getLabelsTitle() : DEFAULT_LABELS_TITLE;
    }

    private BoardSummaryResponse toSummary(Board board, BoardRole myRole, User me) {
        return new BoardSummaryResponse(board.getId(), board.getName(), board.getDescription(),
                board.getOwner().getFullName(), board.getCreatedAt(),
                myRole, board.getOwner().getId().equals(me.getId()));
    }

    private ListResponse toListResponse(BoardList list) {
        List<CardResponse> cards = list.getCards().stream()
                .map(CardResponse::from)
                .toList();
        return new ListResponse(list.getId(), list.getName(), list.getPosition(), cards);
    }
}
