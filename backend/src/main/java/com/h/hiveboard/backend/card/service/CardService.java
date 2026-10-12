package com.h.hiveboard.backend.card.service;

import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.CardResponse;
import com.h.hiveboard.backend.card.dto.CardDtos.CreateCardRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.UpdateCardRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.MoveCardRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.SetPriorityRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.ReorderCardsRequest;
import com.h.hiveboard.backend.boardlist.entity.BoardList;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.card.repository.CardRepository;
import com.h.hiveboard.backend.boardlist.service.BoardListService;
import com.h.hiveboard.backend.label.service.LabelService;
import com.h.hiveboard.backend.notification.service.NotificationService;
import com.h.hiveboard.backend.realtime.service.BoardEventPublisher;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.CardPayload;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.CardMovedPayload;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.CardDeletedPayload;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.ListPayload;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.ListResponse;
import com.h.hiveboard.backend.exception.ConflictException;
import com.h.hiveboard.backend.member.entity.BoardMember;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.service.BoardAccessService;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
import com.h.hiveboard.backend.exception.ForbiddenOperationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.h.hiveboard.backend.board.entity.Board;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CardService {

    private final CardRepository cardRepository;
    private final BoardListService boardListService; // finds lists with a role check
    private final BoardAccessService boardAccessService;
    private final LabelService labelService;         // validates label ids belong to the board
    private final NotificationService notificationService;
    private final BoardEventPublisher boardEventPublisher;

    @Transactional
    public CardResponse createCard(UUID listId, User user, CreateCardRequest request) {
        BoardList list = boardListService.getListForRole(listId, user, BoardRole.MEMBER);

        validateDue(request.dueDate(), request.dueTime());

        double nextPosition = cardRepository.findMaxPositionByListId(list.getId()).orElse(0.0) + 1.0;
        Card card = Card.builder()
                .title(request.title())
                .description(request.description())
                .position(nextPosition)
                .boardList(list)
                .labels(labelService.resolveBoardLabels(list.getBoard(), request.labelIds()))
                .dueDate(request.dueDate())
                .dueTime(request.dueTime())
                .build();
        boolean assigned = applyAssignee(card, list.getBoard(), request.assigneeId(), user);
        boolean flagged = applyPriority(card, request.highPriority());
        card.setHiddenFromViewers(Boolean.TRUE.equals(request.hiddenFromViewers()));

        cardRepository.save(card);
        notifyAssigneeOfChanges(card, user, assigned, flagged);

        CardResponse response = toResponse(card);
        CardPayload payload = new CardPayload(list.getId(), response);
        boardEventPublisher.publish(list.getBoard().getId(), "CARD_CREATED", user, payload,
                card.isHiddenFromViewers() ? null : "CARD_CREATED", payload);
        return response;
    }

    @Transactional
    public CardResponse updateCard(UUID cardId, User user, UpdateCardRequest request) {
        Card card = getCardForRole(cardId, user, BoardRole.MEMBER);
        if (request.version() != null && !request.version().equals(card.getVersion())) {
            throw new ConflictException("Someone else changed this card while you were editing it. "
                    + "Close it and open it again to see the latest version.");
        }
        boolean wasHidden = card.isHiddenFromViewers();
        validateDue(request.dueDate(), request.dueTime());
        card.setTitle(request.title());
        card.setDescription(request.description());
        card.setDueDate(request.dueDate());
        card.setDueTime(request.dueTime());
        boolean assigned = applyAssignee(card, card.getBoardList().getBoard(), request.assigneeId(), user);
        boolean flagged = applyPriority(card, request.highPriority());
        if (request.hiddenFromViewers() != null) {
            card.setHiddenFromViewers(request.hiddenFromViewers());
        }
        if (request.labelIds() != null) {
            card.setLabels(labelService.resolveBoardLabels(card.getBoardList().getBoard(), request.labelIds()));
        }
        // Flush so the bumped version is in the response (clients send it back next time)
        cardRepository.saveAndFlush(card);
        notifyAssigneeOfChanges(card, user, assigned, flagged);

        CardResponse response = toResponse(card);
        publishCardUpdated(card, wasHidden, response, user);
        return response;
    }

    // Flagging moves the card to the top of its list (it's listed first);
    // unflagging puts it back in its normal position.
    @Transactional
    public CardResponse setPriority(UUID cardId, User user, SetPriorityRequest request) {
        Card card = getCardForRole(cardId, user, BoardRole.MEMBER);
        boolean flagged = applyPriority(card, request.highPriority());
        cardRepository.saveAndFlush(card);
        notifyAssigneeOfChanges(card, user, false, flagged);

        CardResponse response = toResponse(card);
        publishCardUpdated(card, card.isHiddenFromViewers(), response, user);
        return response;
    }

    // Flags / unflags a card (null = leave as is). Only a real change updates
    // flaggedAt, so re-saving a flagged card doesn't bump it above newer flags.
    // Returns true when the card was newly flagged.
    private boolean applyPriority(Card card, Boolean highPriority) {
        if (highPriority == null || highPriority == card.isHighPriority()) {
            return false;
        }
        card.setHighPriority(highPriority);
        card.setFlaggedAt(highPriority ? Instant.now().truncatedTo(ChronoUnit.MICROS) : null);
        return highPriority;
    }

    // Members get CARD_UPDATED. Viewers get what the change means for them:
    // just hidden -> CARD_DELETED, just unhidden -> CARD_CREATED, still hidden -> nothing.
    private void publishCardUpdated(Card card, boolean wasHidden, CardResponse response, User actor) {
        UUID listId = card.getBoardList().getId();
        CardPayload payload = new CardPayload(listId, response);

        String viewerType;
        Object viewerPayload;
        if (card.isHiddenFromViewers()) {
            viewerType = wasHidden ? null : "CARD_DELETED";
            viewerPayload = wasHidden ? null : new CardDeletedPayload(listId, card.getId());
        } else {
            viewerType = wasHidden ? "CARD_CREATED" : "CARD_UPDATED";
            viewerPayload = payload;
        }
        boardEventPublisher.publish(card.getBoardList().getBoard().getId(), "CARD_UPDATED", actor,
                payload, viewerType, viewerPayload);
    }

    // One notification per save: being assigned already mentions high priority,
    // so a card that's assigned and flagged together doesn't notify twice.
    private void notifyAssigneeOfChanges(Card card, User actor, boolean assigned, boolean flagged) {
        if (assigned) {
            notificationService.cardAssigned(card, actor);
        } else if (flagged) {
            notificationService.cardFlagged(card, actor);
        }
    }

    // Dragging a card into a DIFFERENT column: move it to the end of that
    // column, then compact the old column's positions so there's no gap.
    @Transactional
    public CardResponse moveCard(UUID cardId, User user, MoveCardRequest request) {
        Card card = getCardForRole(cardId, user, BoardRole.MEMBER);
        BoardList targetList = boardListService.getListForRole(request.targetListId(), user, BoardRole.MEMBER);

        if (!targetList.getBoard().getId().equals(card.getBoardList().getBoard().getId())) {
            throw new ForbiddenOperationException("Cards can only move within the same board");
        }

        BoardList sourceList = card.getBoardList();
        double nextPosition = cardRepository.findMaxPositionByListId(targetList.getId()).orElse(0.0) + 1.0;

        card.setBoardList(targetList);
        card.setPosition(nextPosition);
        cardRepository.saveAndFlush(card);

        if (!sourceList.getId().equals(targetList.getId())) {
            compactPositions(sourceList);
        }

        // Dropped at a specific spot: apply the target list's new order. Any mismatch means the
        // list changed meanwhile -> 400, and the whole move rolls back (the client reloads).
        List<Card> targetCards = null;
        if (request.orderedCardIds() != null) {
            targetCards = cardRepository.findByBoardListOrderByPositionAsc(targetList);
            Map<UUID, Card> byId = new HashMap<>();
            targetCards.forEach(c -> byId.put(c.getId(), c));
            List<UUID> orderedIds = request.orderedCardIds();
            if (orderedIds.size() != byId.size() || !byId.keySet().equals(new HashSet<>(orderedIds))) {
                throw new IllegalArgumentException("That list changed while you were moving the card. Please try again.");
            }
            for (int i = 0; i < orderedIds.size(); i++) {
                byId.get(orderedIds.get(i)).setPosition((double) i);
            }
            cardRepository.saveAll(targetCards);
            cardRepository.flush();
        }

        CardResponse response = toResponse(card);
        CardMovedPayload payload = new CardMovedPayload(sourceList.getId(), targetList.getId(), response);
        boardEventPublisher.publish(targetList.getBoard().getId(), "CARD_MOVED", user, payload,
                card.isHiddenFromViewers() ? null : "CARD_MOVED", payload);
        if (targetCards != null) {
            // ...followed by the target list's authoritative order (viewers: without hidden cards)
            boardEventPublisher.publish(targetList.getBoard().getId(), "CARDS_REORDERED", user,
                    new ListPayload(ListResponse.from(targetList, false)),
                    "CARDS_REORDERED", new ListPayload(ListResponse.from(targetList, true)));
        }
        return response;
    }

    // Copies a card into the same list, right below the original: title (+ " (copy)"),
    // description, labels, due date/time and viewer visibility. Not copied: the assignee
    // (they'd get a surprise "assigned to you" notification), the high-priority flag and comments.
    @Transactional
    public CardResponse duplicateCard(UUID cardId, User user) {
        Card source = getCardForRole(cardId, user, BoardRole.MEMBER);
        BoardList list = source.getBoardList();

        // Between the original and the card after it (positions are decimals for exactly this)
        double position = cardRepository.findByBoardListOrderByPositionAsc(list).stream()
                .map(Card::getPosition)
                .filter(p -> p > source.getPosition())
                .findFirst()
                .map(next -> (source.getPosition() + next) / 2)
                .orElse(source.getPosition() + 1.0);

        String title = source.getTitle() + " (copy)";
        Card copy = Card.builder()
                .title(title.length() > 255 ? title.substring(0, 255) : title)
                .description(source.getDescription())
                .position(position)
                .boardList(list)
                .labels(new HashSet<>(source.getLabels()))
                .dueDate(source.getDueDate())
                .dueTime(source.getDueTime())
                .hiddenFromViewers(source.isHiddenFromViewers())
                .build();
        cardRepository.save(copy);

        CardResponse response = toResponse(copy);
        CardPayload payload = new CardPayload(list.getId(), response);
        boardEventPublisher.publish(list.getBoard().getId(), "CARD_CREATED", user, payload,
                copy.isHiddenFromViewers() ? null : "CARD_CREATED", payload);
        return response;
    }

    // Reordering cards WITHIN the same column — same "send the full ordered
    // array" contract as list reordering, for the same reason: no fiddly
    // insert-at-index math server-side.
    @Transactional
    public void reorderCards(UUID listId, User user, ReorderCardsRequest request) {
        BoardList list = boardListService.getListForRole(listId, user, BoardRole.MEMBER);

        Map<UUID, Card> byId = new HashMap<>();
        for (Card card : list.getCards()) {
            byId.put(card.getId(), card);
        }

        List<UUID> orderedIds = request.orderedCardIds();
        if (orderedIds.size() != byId.size()) {
            throw new IllegalArgumentException("Reorder must include every card in this list");
        }

        for (int i = 0; i < orderedIds.size(); i++) {
            Card card = byId.get(orderedIds.get(i));
            if (card == null) {
                throw new IllegalArgumentException("Card " + orderedIds.get(i) + " does not belong to this list");
            }
            card.setPosition((double) i);
        }
        cardRepository.saveAll(byId.values());
        cardRepository.flush();

        // Last write wins, so everyone gets the list's resulting order and replaces theirs
        boardEventPublisher.publish(list.getBoard().getId(), "CARDS_REORDERED", user,
                new ListPayload(ListResponse.from(list, false)),
                "CARDS_REORDERED", new ListPayload(ListResponse.from(list, true)));
    }

    @Transactional
    public void deleteCard(UUID cardId, User user) {
        Card card = getCardForRole(cardId, user, BoardRole.MEMBER);
        BoardList list = card.getBoardList();
        boolean hidden = card.isHiddenFromViewers();
        cardRepository.delete(card);
        compactPositions(list);

        CardDeletedPayload payload = new CardDeletedPayload(list.getId(), cardId);
        boardEventPublisher.publish(list.getBoard().getId(), "CARD_DELETED", user, payload,
                hidden ? null : "CARD_DELETED", payload);
    }

    private void compactPositions(BoardList list) {
        List<Card> remaining = cardRepository.findByBoardListOrderByPositionAsc(list);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setPosition((double) i);
        }
        cardRepository.saveAll(remaining);
    }

    // Sets the assignee (must be a board member). "Assigned by" is recorded
    // automatically as whoever made the change; unchanged assignees keep theirs.
    // Returns true when the card was assigned to someone new.
    private boolean applyAssignee(Card card, Board board, Long assigneeId, User actor) {
        Long current = card.getAssignee() != null ? card.getAssignee().getId() : null;
        if (Objects.equals(current, assigneeId)) {
            return false;
        }

        if (assigneeId == null) {
            card.setAssignee(null);
            card.setAssignedBy(null);
            card.setAssignedAt(null);
            return false;
        }

        card.setAssignee(boardAccessService.requireMemberUser(board.getId(), assigneeId));
        card.setAssignedBy(actor);
        // Microseconds, like PostgreSQL stores it, so the response matches what's saved
        card.setAssignedAt(Instant.now().truncatedTo(ChronoUnit.MICROS));
        return true;
    }

    // A due time only makes sense on a due day.
    private void validateDue(LocalDate dueDate, LocalTime dueTime) {
        if (dueTime != null && dueDate == null) {
            throw new IllegalArgumentException("A due time needs a due date");
        }
    }

    // Finds a card and checks the caller's role on its board (404 for non-members).
    // Public so CommentService can reuse it.
    public Card getCardForRole(UUID cardId, User user, BoardRole required) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("No card with id " + cardId));

        BoardMember member = boardAccessService.requireMembership(
                card.getBoardList().getBoard().getId(), user, BoardRole.VIEWER);

        // To a Viewer, a hidden card doesn't exist: same 404 as a missing card, checked
        // before the role so a 403 can't give away that the card is there.
        if (card.isHiddenFromViewers() && member.getRole() == BoardRole.VIEWER) {
            throw new ResourceNotFoundException("No card with id " + cardId);
        }
        boardAccessService.requireRoleOf(member, required);
        return card;
    }

    private CardResponse toResponse(Card card) {
        return CardResponse.from(card);
    }
}
