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
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.service.BoardAccessService;
import com.h.hiveboard.backend.activity.entity.ActivityType;
import com.h.hiveboard.backend.activity.service.ActivityRecorder;
import com.h.hiveboard.backend.realtime.service.BoardEventPublisher;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.ListPayload;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.ListRenamedPayload;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.ListDeletedPayload;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.ListsReorderedPayload;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.ListResponse;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
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
    private final BoardAccessService boardAccessService; // role checks
    private final BoardEventPublisher boardEventPublisher;
    private final ActivityRecorder activityRecorder;         // the board's history

    @Transactional
    public ListResponse createList(UUID boardId, User user, CreateListRequest request) {
        Board board = boardAccessService.requireRole(boardId, user, BoardRole.MEMBER);

        double nextPosition = boardListRepository.findMaxPositionByBoardId(board.getId()).orElse(0.0) + 1.0;
        BoardList list = BoardList.builder()
                .name(request.name())
                .position(nextPosition)
                .board(board)
                .build();

        boardListRepository.save(list);
        activityRecorder.board(board, user, ActivityType.LIST_CREATED, "added the list " + ActivityRecorder.quote(list.getName()));
        ListResponse response = toResponse(list);
        boardEventPublisher.publish(board.getId(), "LIST_CREATED", user, new ListPayload(response));
        return response;
    }

    @Transactional
    public ListResponse updateList(UUID listId, User user, UpdateListRequest request) {
        BoardList list = getActiveListForRole(listId, user, BoardRole.MEMBER);
        String oldName = list.getName();
        list.setName(request.name());
        boardListRepository.save(list);
        if (!oldName.equals(list.getName())) {
            activityRecorder.board(list.getBoard(), user, ActivityType.LIST_RENAMED,
                    "renamed the list " + ActivityRecorder.quote(oldName) + " to " + ActivityRecorder.quote(list.getName()));
        }
        boardEventPublisher.publish(list.getBoard().getId(), "LIST_UPDATED", user,
                new ListRenamedPayload(list.getId(), list.getName()));
        return toResponse(list);
    }

    // Frontend sends the full ordered array of list ids after a drag,
    // so reordering is just: re-stamp position = index in that array.
    @Transactional
    public void reorderLists(UUID boardId, User user, ReorderListsRequest request) {
        Board board = boardAccessService.requireRole(boardId, user, BoardRole.MEMBER);

        // Archived lists keep their place out of sight; only the board's lists are reordered
        Map<UUID, BoardList> byId = new HashMap<>();
        for (BoardList list : board.getLists()) {
            if (!list.isArchived()) byId.put(list.getId(), list);
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
        boardEventPublisher.publish(board.getId(), "LISTS_REORDERED", user, new ListsReorderedPayload(orderedIds));
    }

    @Transactional
    public void deleteList(UUID listId, User user) {
        BoardList list = getListForRole(listId, user, BoardRole.MEMBER);
        UUID boardId = list.getBoard().getId();
        int cardCount = list.getCards().size();
        activityRecorder.board(list.getBoard(), user, ActivityType.LIST_DELETED,
                "deleted the list " + ActivityRecorder.quote(list.getName())
                        + (cardCount == 0 ? "" : " and its " + cardCount + (cardCount == 1 ? " card" : " cards")));
        boardListRepository.delete(list);
        boardEventPublisher.publish(boardId, "LIST_DELETED", user, new ListDeletedPayload(listId));
    }

    // ---- Archive ----

    // Takes the list (and the cards on it) off the board. Its cards stay with it, so
    // restoring the list brings them all back.
    @Transactional
    public void archiveList(UUID listId, User user) {
        BoardList list = getActiveListForRole(listId, user, BoardRole.MEMBER);
        list.setArchived(true);
        list.setArchivedAt(Instant.now().truncatedTo(ChronoUnit.MICROS));
        list.setArchivedBy(user);
        boardListRepository.save(list);

        long cardCount = list.getCards().stream().filter(c -> !c.isArchived()).count();
        activityRecorder.board(list.getBoard(), user, ActivityType.LIST_ARCHIVED,
                "archived the list " + ActivityRecorder.quote(list.getName())
                        + (cardCount == 0 ? "" : " with its " + cardCount + (cardCount == 1 ? " card" : " cards")));
        boardEventPublisher.publish(list.getBoard().getId(), "LIST_ARCHIVED", user, new ListDeletedPayload(listId));
    }

    // Puts an archived list back, at the end of the board, with its cards
    @Transactional
    public ListResponse restoreList(UUID listId, User user) {
        BoardList list = getListForRole(listId, user, BoardRole.MEMBER);
        if (!list.isArchived()) {
            throw new IllegalArgumentException("This list isn't archived");
        }
        list.setArchived(false);
        list.setArchivedAt(null);
        list.setArchivedBy(null);
        list.setPosition(boardListRepository.findMaxPositionByBoardId(list.getBoard().getId()).orElse(0.0) + 1.0);
        boardListRepository.save(list);

        activityRecorder.board(list.getBoard(), user, ActivityType.LIST_RESTORED,
                "restored the list " + ActivityRecorder.quote(list.getName()));
        boardEventPublisher.publish(list.getBoard().getId(), "LIST_RESTORED", user,
                new ListPayload(ListResponse.from(list, false)),
                "LIST_RESTORED", new ListPayload(ListResponse.from(list, true)));
        return toResponse(list);
    }

    // "Archive all cards in this list" (e.g. clearing out a Done list). Returns how many.
    @Transactional
    public int archiveAllCards(UUID listId, User user) {
        BoardList list = getActiveListForRole(listId, user, BoardRole.MEMBER);
        Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
        List<Card> cards = list.getCards().stream().filter(c -> !c.isArchived()).toList();
        for (Card card : cards) {
            card.setArchived(true);
            card.setArchivedAt(now);
            card.setArchivedBy(user);
            // Each card's own history says it was archived (and from where)
            activityRecorder.card(card, user, ActivityType.CARD_ARCHIVED,
                    "archived {card} from " + ActivityRecorder.quote(list.getName()));
        }
        boardListRepository.saveAndFlush(list);

        boardEventPublisher.publish(list.getBoard().getId(), "LIST_CARDS_ARCHIVED", user,
                new ListPayload(ListResponse.from(list, false)),
                "LIST_CARDS_ARCHIVED", new ListPayload(ListResponse.from(list, true)));
        return cards.size();
    }

    // Like getListForRole, for changes: an archived list has to be restored first
    public BoardList getActiveListForRole(UUID listId, User user, BoardRole required) {
        BoardList list = getListForRole(listId, user, required);
        if (list.isArchived()) {
            throw new IllegalArgumentException("The list " + ActivityRecorder.quote(list.getName())
                    + " is archived. Restore it first.");
        }
        return list;
    }

    // Finds a list and checks the caller's role on its board (404 for non-members).
    // Public so CardService can reuse it.
    public BoardList getListForRole(UUID listId, User user, BoardRole required) {
        BoardList list = boardListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("No list with id " + listId));

        boardAccessService.requireRole(list.getBoard().getId(), user, required);
        return list;
    }

    private ListResponse toResponse(BoardList list) {
        return ListResponse.from(list, false);
    }
}
