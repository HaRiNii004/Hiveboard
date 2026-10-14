package com.h.hiveboard.backend.board.service;

import com.h.hiveboard.backend.board.dto.BoardDtos.CreateBoardRequest;
import com.h.hiveboard.backend.board.dto.BoardDtos.UpdateBoardRequest;
import com.h.hiveboard.backend.board.dto.BoardDtos.StarBoardRequest;
import com.h.hiveboard.backend.board.dto.BoardDtos.UpdateLabelsTitleRequest;
import com.h.hiveboard.backend.board.dto.BoardDtos.LabelsTitleResponse;
import com.h.hiveboard.backend.board.dto.BoardDtos.BoardSummaryResponse;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.BoardDetailResponse;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.ListResponse;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.CardResponse;
import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.boardlist.entity.BoardList;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.repository.BoardRepository;
import com.h.hiveboard.backend.label.dto.LabelDtos.LabelResponse;
import com.h.hiveboard.backend.member.entity.BoardMember;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.repository.BoardMemberRepository;
import com.h.hiveboard.backend.member.service.BoardAccessService;
import com.h.hiveboard.backend.activity.entity.ActivityType;
import com.h.hiveboard.backend.activity.service.ActivityRecorder;
import com.h.hiveboard.backend.realtime.service.BoardEventPublisher;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.BoardUpdatedPayload;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.BoardDeletedPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
    private final BoardEventPublisher boardEventPublisher;
    private final ActivityRecorder activityRecorder;         // the board's history

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
        activityRecorder.board(board, owner, ActivityType.BOARD_CREATED, "created this board");
        return toSummary(board, BoardRole.ADMIN, owner, null);
    }

    // Every board I'm a member of — my own and ones shared with me — newest first.
    @Transactional(readOnly = true)
    public List<BoardSummaryResponse> getMyBoards(User user) {
        return boardMemberRepository.findByUserId(user.getId())
                .stream()
                .sorted(Comparator.comparing((BoardMember m) -> m.getBoard().getCreatedAt(),
                        Comparator.nullsLast(Comparator.<Instant>naturalOrder())).reversed())
                .map(m -> toSummary(m.getBoard(), m.getRole(), user, m))
                .toList();
    }

    @Transactional(readOnly = true)
    public BoardDetailResponse getBoardDetail(UUID boardId, User user) {
        BoardMember membership = boardAccessService.requireMembership(boardId, user, BoardRole.VIEWER);
        Board board = membership.getBoard();

        boolean isViewer = membership.getRole() == BoardRole.VIEWER;
        List<ListResponse> lists = board.getLists().stream()
                .filter(list -> !list.isArchived()) // see the board's archive
                .map(list -> toListResponse(list, isViewer))
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
        String oldTitle = labelsTitleOf(board);
        board.setLabelsTitle(request.labelsTitle().trim());
        boardRepository.save(board);
        if (!oldTitle.equals(labelsTitleOf(board))) {
            activityRecorder.board(board, user, ActivityType.BOARD_UPDATED,
                    "renamed the labels field to " + ActivityRecorder.quote(labelsTitleOf(board)));
        }
        publishBoardUpdated(board, user);
        return new LabelsTitleResponse(labelsTitleOf(board));
    }

    @Transactional
    public BoardSummaryResponse updateBoard(UUID boardId, User user, UpdateBoardRequest request) {
        BoardMember membership = boardAccessService.requireMembership(boardId, user, BoardRole.ADMIN);
        Board board = membership.getBoard();
        String oldName = board.getName();
        String oldDescription = board.getDescription() == null ? "" : board.getDescription().strip();
        board.setName(request.name());
        board.setDescription(request.description());
        boardRepository.save(board);
        if (!oldName.equals(board.getName())) {
            activityRecorder.board(board, user, ActivityType.BOARD_UPDATED,
                    "renamed the board from " + ActivityRecorder.quote(oldName) + " to " + ActivityRecorder.quote(board.getName()));
        }
        String newDescription = board.getDescription() == null ? "" : board.getDescription().strip();
        if (!oldDescription.equals(newDescription)) {
            activityRecorder.board(board, user, ActivityType.BOARD_UPDATED,
                    newDescription.isEmpty() ? "removed the board description" : "updated the board description");
        }
        publishBoardUpdated(board, user);
        return toSummary(board, BoardRole.ADMIN, user, membership);
    }

    // Star / unstar a board for yourself. Any member may (viewers too): it only affects you.
    @Transactional
    public BoardSummaryResponse setStarred(UUID boardId, User user, StarBoardRequest request) {
        BoardMember membership = boardAccessService.requireMembership(boardId, user, BoardRole.VIEWER);
        boolean starred = request.starred();
        if (starred != membership.isStarred()) {
            membership.setStarred(starred);
            membership.setStarredAt(starred ? Instant.now().truncatedTo(ChronoUnit.MICROS) : null);
            boardMemberRepository.save(membership);
        }
        return toSummary(membership.getBoard(), membership.getRole(), user, membership);
    }

    // Cascades to lists, cards, comments, labels, memberships and invitations.
    @Transactional
    public void deleteBoard(UUID boardId, User user) {
        Board board = boardAccessService.requireRole(boardId, user, BoardRole.ADMIN);
        // Publish first: it snapshots the members, whose rows are deleted with the board
        boardEventPublisher.publish(boardId, "BOARD_DELETED", user, new BoardDeletedPayload(boardId));
        boardRepository.delete(board);
    }

    private void publishBoardUpdated(Board board, User actor) {
        boardEventPublisher.publish(board.getId(), "BOARD_UPDATED", actor,
                new BoardUpdatedPayload(board.getName(), board.getDescription(), labelsTitleOf(board)));
    }

    private String labelsTitleOf(Board board) {
        return board.getLabelsTitle() != null ? board.getLabelsTitle() : DEFAULT_LABELS_TITLE;
    }

    // `membership` is the caller's own (for their star); null for a brand-new board.
    private BoardSummaryResponse toSummary(Board board, BoardRole myRole, User me, BoardMember membership) {
        return new BoardSummaryResponse(board.getId(), board.getName(), board.getDescription(),
                board.getOwner().getFullName(), board.getCreatedAt(),
                myRole, board.getOwner().getId().equals(me.getId()),
                membership != null && membership.isStarred(),
                membership != null ? membership.getStarredAt() : null);
    }

    // Cards hidden from viewers are left out entirely when the caller is a Viewer.
    private ListResponse toListResponse(BoardList list, boolean forViewer) {
        return ListResponse.from(list, forViewer);
    }
}
