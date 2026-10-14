package com.h.hiveboard.backend.activity.controller;

import com.h.hiveboard.backend.activity.dto.ActivityDtos.ActivityPageResponse;
import com.h.hiveboard.backend.activity.service.ActivityService;
import com.h.hiveboard.backend.auth.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

// History, newest first. ?before=<id of the last entry you have> loads older ones.
@RestController
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping("/api/boards/{boardId}/activity")
    public ResponseEntity<ActivityPageResponse> boardActivity(@AuthenticationPrincipal User user,
                                                              @PathVariable UUID boardId,
                                                              @RequestParam(required = false) Long before,
                                                              @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(activityService.boardActivity(boardId, user, before, limit));
    }

    @GetMapping("/api/cards/{cardId}/activity")
    public ResponseEntity<ActivityPageResponse> cardActivity(@AuthenticationPrincipal User user,
                                                             @PathVariable UUID cardId,
                                                             @RequestParam(required = false) Long before,
                                                             @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(activityService.cardActivity(cardId, user, before, limit));
    }
}
