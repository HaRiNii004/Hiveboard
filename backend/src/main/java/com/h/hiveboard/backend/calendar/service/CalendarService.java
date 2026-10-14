package com.h.hiveboard.backend.calendar.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.calendar.dto.CalendarDtos.CalendarCardResponse;
import com.h.hiveboard.backend.card.repository.CardRepository;
import com.h.hiveboard.backend.member.entity.BoardRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

// The calendar: cards with due dates from every board you're a member of
@Service
@RequiredArgsConstructor
public class CalendarService {

    // A month view with its leading/trailing weeks is at most 42 days; this leaves room
    // for other views without letting one request pull years of cards.
    private static final long MAX_RANGE_DAYS = 100;

    private final CardRepository cardRepository;

    // Cards due from..to (inclusive): by day, all-day cards first, then by time
    @Transactional(readOnly = true)
    public List<CalendarCardResponse> getDueCards(User user, LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("'from' must be on or before 'to'.");
        }
        if (ChronoUnit.DAYS.between(from, to) >= MAX_RANGE_DAYS) {
            throw new IllegalArgumentException("The date range can be at most " + MAX_RANGE_DAYS + " days.");
        }
        return cardRepository.findDueBetweenForMember(user.getId(), from, to, BoardRole.VIEWER).stream()
                .map(CalendarCardResponse::from)
                .sorted(Comparator.comparing(CalendarCardResponse::dueDate)
                        .thenComparing(CalendarCardResponse::dueTime, Comparator.nullsFirst(Comparator.<LocalTime>naturalOrder()))
                        .thenComparing(CalendarCardResponse::title, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }
}
