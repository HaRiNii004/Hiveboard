package com.h.hiveboard.backend.board.dto;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.boardlist.entity.BoardList;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.label.dto.LabelDtos.LabelResponse;
import com.h.hiveboard.backend.label.entity.Label;
import com.h.hiveboard.backend.member.entity.BoardRole;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

// The nested shape for a single board's full view — everything the
// drag-and-drop UI needs in one call: lists, each with its cards, in order.
public class BoardDetailsDtos {

    // A person shown on a card (assignee / assigned by)
    public record CardUserResponse(Long id, String fullName, String email) {
        static CardUserResponse from(User user) {
            return user == null ? null : new CardUserResponse(user.getId(), user.getFullName(), user.getEmail());
        }
    }

    public record CardResponse(UUID id, String title, String description, Double position,
                               List<LabelResponse> labels, LocalDate dueDate, LocalTime dueTime,
                               int commentCount, CardUserResponse assignee, CardUserResponse assignedBy,
                               Instant assignedAt, boolean highPriority, Instant flaggedAt,
                               boolean hiddenFromViewers, Long version) {
        // Shared by BoardService, BoardListService and CardService so the
        // card shape (including its labels, oldest first) is built in one place.
        public static CardResponse from(Card card) {
            List<LabelResponse> labels = card.getLabels().stream()
                    .sorted(Comparator.comparing(Label::getCreatedAt, Comparator.nullsLast(Comparator.<Instant>naturalOrder()))
                            .thenComparing(Label::getName))
                    .map(LabelResponse::from)
                    .toList();
            return new CardResponse(card.getId(), card.getTitle(), card.getDescription(), card.getPosition(),
                    labels, card.getDueDate(), card.getDueTime(), card.getComments().size(),
                    CardUserResponse.from(card.getAssignee()), CardUserResponse.from(card.getAssignedBy()),
                    card.getAssignedAt(), card.isHighPriority(), card.getFlaggedAt(),
                    card.isHiddenFromViewers(), card.getVersion());
        }

        // How cards are shown in a list: high-priority cards first (most recently
        // flagged on top), then everything else in its normal position order.
        public static List<CardResponse> inDisplayOrder(List<Card> cards) {
            Comparator<Card> flaggedFirst = Comparator.comparing(Card::isHighPriority).reversed();
            Comparator<Card> newestFlagFirst = Comparator.comparing(
                    (Card c) -> c.isHighPriority() ? c.getFlaggedAt() : null,
                    Comparator.nullsLast(Comparator.<Instant>reverseOrder()));
            return cards.stream()
                    .sorted(flaggedFirst.thenComparing(newestFlagFirst).thenComparing(Card::getPosition))
                    .map(CardResponse::from)
                    .toList();
        }
    }

    public record ListResponse(UUID id, String name, Double position, List<CardResponse> cards) {
        // forViewer leaves out cards hidden from viewers
        public static ListResponse from(BoardList list, boolean forViewer) {
            List<Card> cards = forViewer
                    ? list.getCards().stream().filter(card -> !card.isHiddenFromViewers()).toList()
                    : list.getCards();
            return new ListResponse(list.getId(), list.getName(), list.getPosition(), CardResponse.inDisplayOrder(cards));
        }
    }

    // labelsTitle is the board's name for its labels field (e.g. "Labels", "Tags"),
    // labels are the options every card on the board can pick from,
    // myRole is the caller's role so the UI can hide what they can't do.
    public record BoardDetailResponse(UUID id, String name, String description,
                                      String labelsTitle, List<LabelResponse> labels,
                                      List<ListResponse> lists, BoardRole myRole) {}
}
