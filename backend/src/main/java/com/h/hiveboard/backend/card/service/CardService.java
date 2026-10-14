package com.h.hiveboard.backend.card.service;

import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.CardResponse;
import com.h.hiveboard.backend.card.dto.CardDtos.CreateCardRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.UpdateCardRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.MoveCardRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.SetPriorityRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.ReorderCardsRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.RestoreCardRequest;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.CardArchivedPayload;
import com.h.hiveboard.backend.boardlist.entity.BoardList;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.card.repository.CardRepository;
import com.h.hiveboard.backend.boardlist.service.BoardListService;
import com.h.hiveboard.backend.label.service.LabelService;
import com.h.hiveboard.backend.notification.service.NotificationService;
import com.h.hiveboard.backend.activity.entity.ActivityType;
import com.h.hiveboard.backend.activity.service.ActivityRecorder;
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
import com.h.hiveboard.backend.label.entity.Label;
import java.util.Comparator;
import java.util.Set;
import java.util.stream.Collectors;
import static com.h.hiveboard.backend.activity.service.ActivityRecorder.quote;
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
    private final ActivityRecorder activityRecorder;         // the board's history

    @Transactional
    public CardResponse createCard(UUID listId, User user, CreateCardRequest request) {
        BoardList list = boardListService.getActiveListForRole(listId, user, BoardRole.MEMBER);

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
        activityRecorder.card(card, user, ActivityType.CARD_CREATED, "added {card} to " + quote(list.getName()));
        if (assigned) {
            activityRecorder.card(card, user, ActivityType.CARD_ASSIGNEE,
                    "assigned {card} to " + card.getAssignee().getFullName());
        }

        CardResponse response = toResponse(card);
        CardPayload payload = new CardPayload(list.getId(), response);
        boardEventPublisher.publish(list.getBoard().getId(), "CARD_CREATED", user, payload,
                card.isHiddenFromViewers() ? null : "CARD_CREATED", payload);
        return response;
    }

    @Transactional
    public CardResponse updateCard(UUID cardId, User user, UpdateCardRequest request) {
        Card card = getEditableCard(cardId, user);
        if (request.version() != null && !request.version().equals(card.getVersion())) {
            throw new ConflictException("Someone else changed this card while you were editing it. "
                    + "Close it and open it again to see the latest version.");
        }
        boolean wasHidden = card.isHiddenFromViewers();
        validateDue(request.dueDate(), request.dueTime());
        CardState before = CardState.of(card);
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
        recordChanges(card, before, user);

        CardResponse response = toResponse(card);
        publishCardUpdated(card, wasHidden, response, user);
        return response;
    }

    // What a card looked like before an edit, to describe the change in its history
    private record CardState(String title, String description, LocalDate dueDate, LocalTime dueTime,
                             User assignee, Set<Label> labels, boolean highPriority, boolean hidden) {
        static CardState of(Card card) {
            return new CardState(card.getTitle(), card.getDescription(), card.getDueDate(), card.getDueTime(),
                    card.getAssignee(), new HashSet<>(card.getLabels()), card.isHighPriority(),
                    card.isHiddenFromViewers());
        }
    }

    // One history entry per kind of change (renamed, due date, labels, ...)
    private void recordChanges(Card card, CardState before, User user) {
        if (!Objects.equals(before.title(), card.getTitle())) {
            activityRecorder.card(card, user, ActivityType.CARD_RENAMED, "renamed {card} (was " + quote(before.title()) + ")");
        }

        String oldDescription = blankToNull(before.description());
        String newDescription = blankToNull(card.getDescription());
        if (!Objects.equals(oldDescription, newDescription)) {
            activityRecorder.card(card, user, ActivityType.CARD_DESCRIPTION,
                    oldDescription == null ? "added a description to {card}"
                            : newDescription == null ? "removed the description from {card}"
                            : "edited the description of {card}");
        }

        if (!Objects.equals(before.dueDate(), card.getDueDate()) || !Objects.equals(before.dueTime(), card.getDueTime())) {
            activityRecorder.card(card, user, ActivityType.CARD_DUE_DATE,
                    before.dueDate() == null ? "set the due date of {card} to " + ActivityRecorder.due(card.getDueDate(), card.getDueTime())
                            : card.getDueDate() == null ? "removed the due date from {card}"
                            : "changed the due date of {card} from " + ActivityRecorder.due(before.dueDate(), before.dueTime())
                            + " to " + ActivityRecorder.due(card.getDueDate(), card.getDueTime()));
        }

        User oldAssignee = before.assignee();
        User newAssignee = card.getAssignee();
        Long oldId = oldAssignee != null ? oldAssignee.getId() : null;
        Long newId = newAssignee != null ? newAssignee.getId() : null;
        if (!Objects.equals(oldId, newId)) {
            activityRecorder.card(card, user, ActivityType.CARD_ASSIGNEE,
                    oldAssignee == null ? "assigned {card} to " + newAssignee.getFullName()
                            : newAssignee == null ? "unassigned " + oldAssignee.getFullName() + " from {card}"
                            : "reassigned {card} from " + oldAssignee.getFullName() + " to " + newAssignee.getFullName());
        }

        String added = labelNames(card.getLabels(), before.labels());
        String removed = labelNames(before.labels(), card.getLabels());
        if (!added.isEmpty() || !removed.isEmpty()) {
            activityRecorder.card(card, user, ActivityType.CARD_LABELS,
                    removed.isEmpty() ? "added " + added + " to {card}"
                            : added.isEmpty() ? "removed " + removed + " from {card}"
                            : "added " + added + " and removed " + removed + " on {card}");
        }

        recordPriorityChange(card, before.highPriority(), user);

        if (before.hidden() != card.isHiddenFromViewers()) {
            activityRecorder.card(card, user, ActivityType.CARD_VISIBILITY,
                    card.isHiddenFromViewers() ? "hid {card} from viewers" : "made {card} visible to viewers");
        }
    }

    private void recordPriorityChange(Card card, boolean wasHighPriority, User user) {
        if (wasHighPriority != card.isHighPriority()) {
            activityRecorder.card(card, user, ActivityType.CARD_PRIORITY,
                    card.isHighPriority() ? "flagged {card} as high priority" : "removed the high-priority flag from {card}");
        }
    }

    // Labels in `in` but not in `notIn`: "the label “Bug”" / "the labels “Bug”, “UI”"
    private static String labelNames(Set<Label> in, Set<Label> notIn) {
        Set<UUID> exclude = notIn.stream().map(Label::getId).collect(Collectors.toSet());
        List<String> names = in.stream()
                .filter(label -> !exclude.contains(label.getId()))
                .map(Label::getName)
                .sorted(Comparator.comparing(String::toLowerCase))
                .map(ActivityRecorder::quote)
                .toList();
        if (names.isEmpty()) return "";
        return (names.size() == 1 ? "the label " : "the labels ") + String.join(", ", names);
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.strip();
    }

    // Flagging moves the card to the top of its list (it's listed first);
    // unflagging puts it back in its normal position.
    @Transactional
    public CardResponse setPriority(UUID cardId, User user, SetPriorityRequest request) {
        Card card = getEditableCard(cardId, user);
        boolean wasHighPriority = card.isHighPriority();
        boolean flagged = applyPriority(card, request.highPriority());
        cardRepository.saveAndFlush(card);
        notifyAssigneeOfChanges(card, user, false, flagged);
        recordPriorityChange(card, wasHighPriority, user);

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
        Card card = getEditableCard(cardId, user);
        BoardList targetList = boardListService.getActiveListForRole(request.targetListId(), user, BoardRole.MEMBER);

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
            activityRecorder.card(card, user, ActivityType.CARD_MOVED,
                    "moved {card} from " + quote(sourceList.getName()) + " to " + quote(targetList.getName()));
        }

        // Dropped at a specific spot: apply the target list's new order. Any mismatch means the
        // list changed meanwhile -> 400, and the whole move rolls back (the client reloads).
        List<Card> targetCards = null;
        if (request.orderedCardIds() != null) {
            targetCards = cardRepository.findByBoardListAndArchivedFalseOrderByPositionAsc(targetList);
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
        Card source = getEditableCard(cardId, user);
        BoardList list = source.getBoardList();

        // Between the original and the card after it (positions are decimals for exactly this)
        double position = cardRepository.findByBoardListAndArchivedFalseOrderByPositionAsc(list).stream()
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
        activityRecorder.card(copy, user, ActivityType.CARD_DUPLICATED,
                "added {card} as a copy of " + quote(source.getTitle()));

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
        BoardList list = boardListService.getActiveListForRole(listId, user, BoardRole.MEMBER);

        Map<UUID, Card> byId = new HashMap<>();
        for (Card card : list.getCards()) {
            if (!card.isArchived()) byId.put(card.getId(), card); // archived cards aren't on the board
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
        activityRecorder.card(card, user, ActivityType.CARD_DELETED, "deleted {card} from " + quote(list.getName()));
        cardRepository.delete(card);
        compactPositions(list);

        CardDeletedPayload payload = new CardDeletedPayload(list.getId(), cardId);
        boardEventPublisher.publish(list.getBoard().getId(), "CARD_DELETED", user, payload,
                hidden ? null : "CARD_DELETED", payload);
    }

    // ---- Archive ----

    // Takes the card off the board into the board's archive (it keeps everything:
    // comments, labels, history). Restore puts it back.
    @Transactional
    public void archiveCard(UUID cardId, User user) {
        Card card = getEditableCard(cardId, user);
        BoardList list = card.getBoardList();
        card.setArchived(true);
        card.setArchivedAt(Instant.now().truncatedTo(ChronoUnit.MICROS));
        card.setArchivedBy(user);
        cardRepository.saveAndFlush(card);
        compactPositions(list);

        activityRecorder.card(card, user, ActivityType.CARD_ARCHIVED, "archived {card} from " + quote(list.getName()));
        CardArchivedPayload payload = new CardArchivedPayload(list.getId(), card.getId());
        boardEventPublisher.publish(list.getBoard().getId(), "CARD_ARCHIVED", user, payload,
                card.isHiddenFromViewers() ? null : "CARD_ARCHIVED", payload);
    }

    // Back onto the board, at the end of its list (or of request.listId, e.g. when its
    // own list is archived)
    @Transactional
    public CardResponse restoreCard(UUID cardId, User user, RestoreCardRequest request) {
        Card card = getCardForRole(cardId, user, BoardRole.MEMBER);
        if (!card.isArchived()) {
            throw new IllegalArgumentException("This card isn't archived");
        }
        BoardList target = card.getBoardList();
        if (request != null && request.listId() != null) {
            target = boardListService.getListForRole(request.listId(), user, BoardRole.MEMBER);
            if (!target.getBoard().getId().equals(card.getBoardList().getBoard().getId())) {
                throw new ForbiddenOperationException("Cards can only be restored to a list on the same board");
            }
        }
        if (target.isArchived()) {
            throw new IllegalArgumentException("The list " + quote(target.getName())
                    + " is archived too. Pick another list, or restore the list first.");
        }

        card.setBoardList(target);
        card.setPosition(cardRepository.findMaxPositionByListId(target.getId()).orElse(0.0) + 1.0);
        card.setArchived(false);
        card.setArchivedAt(null);
        card.setArchivedBy(null);
        cardRepository.saveAndFlush(card);

        activityRecorder.card(card, user, ActivityType.CARD_RESTORED, "restored {card} to " + quote(target.getName()));
        CardResponse response = toResponse(card);
        CardPayload payload = new CardPayload(target.getId(), response);
        boardEventPublisher.publish(target.getBoard().getId(), "CARD_RESTORED", user, payload,
                card.isHiddenFromViewers() ? null : "CARD_RESTORED", payload);
        return response;
    }

    // For changes: archived cards (or cards in an archived list) have to be restored first.
    // Public so CommentService can use it.
    public Card getEditableCard(UUID cardId, User user) {
        Card card = getCardForRole(cardId, user, BoardRole.MEMBER);
        if (card.isArchived()) {
            throw new IllegalArgumentException("This card is archived. Restore it first.");
        }
        if (card.getBoardList().isArchived()) {
            throw new IllegalArgumentException("This card's list is archived. Restore the list first.");
        }
        return card;
    }

    private void compactPositions(BoardList list) {
        List<Card> remaining = cardRepository.findByBoardListAndArchivedFalseOrderByPositionAsc(list);
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
