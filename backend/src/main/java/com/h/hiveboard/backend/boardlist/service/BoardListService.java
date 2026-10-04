package com.h.hiveboard.backend.boardlist.service;

import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.CardResponse;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.ListResponse;
import com.h.hiveboard.backend.boardlist.dto.BoardListDtos.CreateListRequest;
import com.h.hiveboard.backend.boardlist.dto.BoardListDtos.ReorderListsRequest;
import com.h.hiveboard.backend.boardlist.dto.BoardListDtos.UpdateListRequest;
import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.boardlist.entity.BoardList;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.boardlist.repository.BoardListRepository;
import com.h.hiveboard.backend.board.service.BoardService;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
import com.h.hiveboard.backend.exception.ForbiddenOperationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BoardListService {

    private final BoardListRepository boardListRepository;
    private final BoardService boardService; // reused for its ownership check

    @Transactional
    public ListResponse createList(UUID boardId, User user, CreateListRequest request) {
        Board board = boardService.getOwnedBoard(boardId, user);

        double nextPosition = boardListRepository.findMaxPositionByBoardId(board.getId()).orElse(0.0) + 1.0;
        BoardList list = BoardList.builder()
                .name(request.name())
                .position(nextPosition)
                .board(board)
                .build();

        boardListRepository.save(list);
        return toResponse(list);
    }

    @Transactional
    public ListResponse updateList(UUID listId, User user, UpdateListRequest request) {
        BoardList list = getOwnedList(listId, user);
        list.setName(request.name());
        boardListRepository.save(list);
        return toResponse(list);
    }

    // Frontend sends the full ordered array of list ids after a drag,
    // so reordering is just: re-stamp position = index in that array.
    @Transactional
    public void reorderLists(UUID boardId, User user, ReorderListsRequest request) {
        Board board = boardService.getOwnedBoard(boardId, user);

        Map<UUID, BoardList> byId = new HashMap<>();
        for (BoardList list : board.getLists()) {
            byId.put(list.getId(), list);
        }

        List<UUID> orderedIds = request.orderedListIds();
        if (orderedIds.size() != byId.size()) {
            throw new IllegalArgumentException("Reorder must include every list on the board");
        }

        for (int i = 0; i < orderedIds.size(); i++) {
            BoardList list = byId.get(orderedIds.get(i));
            if (list == null) {
                throw new IllegalArgumentException("List " + orderedIds.get(i) + " does not belong to this board");
            }
            list.setPosition((double) i);
        }
        boardListRepository.saveAll(byId.values());
    }

    @Transactional
    public void deleteList(UUID listId, User user) {
        BoardList list = getOwnedList(listId, user);
        boardListRepository.delete(list);
    }

    // Package-private so CardService can reuse this same ownership check.
    public BoardList getOwnedList(UUID listId, User user) {
        BoardList list = boardListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("No list with id " + listId));

        if (!list.getBoard().getOwner().getId().equals(user.getId())) {
            throw new ForbiddenOperationException("You don't have access to this list");
        }
        return list;
    }

    private ListResponse toResponse(BoardList list) {
        List<CardResponse> cards = list.getCards().stream()
                .map(CardResponse::from)
                .toList();
        return new ListResponse(list.getId(), list.getName(), list.getPosition(), cards);
    }
}
