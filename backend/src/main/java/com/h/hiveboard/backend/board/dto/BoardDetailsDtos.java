package com.h.hiveboard.backend.board.dto;

import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.label.dto.LabelDtos.LabelResponse;
import com.h.hiveboard.backend.label.entity.Label;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

// The nested shape for a single board's full view — everything the
// drag-and-drop UI needs in one call: lists, each with its cards, in order.
public class BoardDetailsDtos {

    public record CardResponse(UUID id, String title, String description, Double position,
                               List<LabelResponse> labels) {
        // Shared by BoardService, BoardListService and CardService so the
        // card shape (including its labels, oldest first) is built in one place.
        public static CardResponse from(Card card) {
            List<LabelResponse> labels = card.getLabels().stream()
                    .sorted(Comparator.comparing(Label::getCreatedAt, Comparator.nullsLast(Comparator.<Instant>naturalOrder()))
                            .thenComparing(Label::getName))
                    .map(LabelResponse::from)
                    .toList();
            return new CardResponse(card.getId(), card.getTitle(), card.getDescription(), card.getPosition(), labels);
        }
    }

    public record ListResponse(UUID id, String name, Double position, List<CardResponse> cards) {}

    // labelsTitle is the board's name for its labels field (e.g. "Labels", "Tags"),
    // labels are the options every card on the board can pick from.
    public record BoardDetailResponse(UUID id, String name, String description,
                                      String labelsTitle, List<LabelResponse> labels,
                                      List<ListResponse> lists) {}
}
