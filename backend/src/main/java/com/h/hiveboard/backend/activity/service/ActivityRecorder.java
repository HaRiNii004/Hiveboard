package com.h.hiveboard.backend.activity.service;

import com.h.hiveboard.backend.activity.dto.ActivityDtos.ActivityResponse;
import com.h.hiveboard.backend.activity.entity.ActivityEntry;
import com.h.hiveboard.backend.activity.entity.ActivityType;
import com.h.hiveboard.backend.activity.repository.ActivityEntryRepository;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.realtime.service.BoardEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

// Writes the board's history. Services call it right where a change happens (they know
// the before/after values), inside their transaction: the entry is saved together with
// the change, and pushed live to the board (ACTIVITY_ADDED) once it commits.
@Service
@RequiredArgsConstructor
public class ActivityRecorder {

    public static final String CARD = "{card}";
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE d MMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm", Locale.ENGLISH);

    private final ActivityEntryRepository activityEntryRepository;
    private final BoardEventPublisher boardEventPublisher;

    // About the board itself (lists, labels, members, ...)
    @Transactional(propagation = Propagation.MANDATORY)
    public void board(Board board, User actor, ActivityType type, String message) {
        save(board, null, actor, type, message);
    }

    // About a card: message should contain {card}
    @Transactional(propagation = Propagation.MANDATORY)
    public void card(Card card, User actor, ActivityType type, String message) {
        save(card.getBoardList().getBoard(), card, actor, type, message);
    }

    private void save(Board board, Card card, User actor, ActivityType type, String message) {
        ActivityEntry entry = activityEntryRepository.save(ActivityEntry.builder()
                .board(board)
                .cardId(card != null ? card.getId() : null)
                .cardTitle(card != null ? card.getTitle() : null)
                .actor(actor)
                .actorName(actor != null ? actor.getFullName() : null)
                .type(type)
                .message(message.length() > 1000 ? message.substring(0, 997) + "..." : message)
                .membersOnly(card != null && card.isHiddenFromViewers())
                .createdAt(Instant.now().truncatedTo(ChronoUnit.MICROS))
                .build());

        ActivityResponse response = ActivityResponse.from(entry);
        boardEventPublisher.publish(board.getId(), "ACTIVITY_ADDED", actor, response,
                entry.isMembersOnly() ? null : "ACTIVITY_ADDED", response);
    }

    // ---- Helpers for writing messages ----

    // “Text”, shortened if long
    public static String quote(String text) {
        if (text == null) return "“”";
        String oneLine = text.strip().replaceAll("\\s+", " ");
        return "“" + (oneLine.length() > 80 ? oneLine.substring(0, 77) + "..." : oneLine) + "”";
    }

    // "Fri 17 Oct 2026" or "Fri 17 Oct 2026, 14:30"
    public static String due(LocalDate date, LocalTime time) {
        return DAY.format(date) + (time != null ? ", " + TIME.format(time) : "");
    }

    // ADMIN -> "Admin"
    public static String role(Enum<?> role) {
        String name = role.name().toLowerCase(Locale.ROOT);
        return Character.toUpperCase(name.charAt(0)) + name.substring(1);
    }
}
