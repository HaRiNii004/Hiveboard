package com.h.hiveboard.backend.calendar.controller;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.calendar.dto.CalendarDtos.CalendarCardResponse;
import com.h.hiveboard.backend.calendar.service.CalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/calendar")
public class CalendarController {

    private final CalendarService calendarService;

    // GET /api/calendar?from=2026-10-01&to=2026-10-31 -> cards due in that range (inclusive)
    @GetMapping
    public ResponseEntity<List<CalendarCardResponse>> dueCards(
            @AuthenticationPrincipal User user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(calendarService.getDueCards(user, from, to));
    }
}
