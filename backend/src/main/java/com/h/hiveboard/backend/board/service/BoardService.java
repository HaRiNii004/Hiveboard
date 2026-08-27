package com.h.hiveboard.backend.board.service;

import com.h.hiveboard.backend.board.dto.BoardDtos.CreateBoardRequest;
import com.h.hiveboard.backend.board.dto.BoardDtos.UpdateBoardRequest;
import com.h.hiveboard.backend.board.dto.BoardDtos.BoardSummaryResponse;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.BoardDetailResponse;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.ListResponse;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.CardResponse;
import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.boardlist.entity.BoardList;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.repository.BoardRepository;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
import com.h.hiveboard.backend.exception.ForbiddenOperationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;

    @Transactional
    public BoardSummaryResponse createBoard(User owner, CreateBoardRequest request) {
        Board board = Board.builder()
                .name(request.name())
                .description(request.description())
                .owner(owner)
                .build();

        boardRepository.save(board);
        return toSummary(board);
    }

    @Transactional(readOnly = true)
    public List<BoardSummaryResponse> getMyBoards(User owner) {
        return boardRepository.findByOwnerOrderByCreatedAtDesc(owner)
                .stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public BoardDetailResponse getBoardDetail(UUID boardId, User user) {
        Board board = getOwnedBoard(boardId, user);

        List<ListResponse> lists = board.getLists().stream()
                .map(this::toListResponse)
                .toList();

        return new BoardDetailResponse(board.getId(), board.getName(), board.getDescription(), lists);
    }

    @Transactional
    public BoardSummaryResponse updateBoard(UUID boardId, User user, UpdateBoardRequest request) {
        Board board = getOwnedBoard(boardId, user);
        board.setName(request.name());
        board.setDescription(request.description());
        boardRepository.save(board);
        return toSummary(board);
    }

    @Transactional
    public void deleteBoard(UUID boardId, User user) {
        Board board = getOwnedBoard(boardId, user);
        boardRepository.delete(board);
    }

    // Package-private so BoardListService/CardService can reuse the same
    // ownership check when reaching a board through a list or card.
    public Board getOwnedBoard(UUID boardId, User user) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("No board with id " + boardId));

        if (!board.getOwner().getId().equals(user.getId())) {
            throw new ForbiddenOperationException("You don't have access to this board");
        }
        return board;
    }

    private BoardSummaryResponse toSummary(Board board) {
        return new BoardSummaryResponse(board.getId(), board.getName(), board.getDescription(), board.getCreatedAt());
    }

    private ListResponse toListResponse(BoardList list) {
        List<CardResponse> cards = list.getCards().stream()
                .map(c -> new CardResponse(c.getId(), c.getTitle(), c.getDescription(), c.getPosition()))
                .toList();
        return new ListResponse(list.getId(), list.getName(), list.getPosition(), cards);
    }
}
