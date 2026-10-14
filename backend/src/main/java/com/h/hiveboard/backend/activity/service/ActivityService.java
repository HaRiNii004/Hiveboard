package com.h.hiveboard.backend.activity.service;

import com.h.hiveboard.backend.activity.dto.ActivityDtos.ActivityPageResponse;
import com.h.hiveboard.backend.activity.dto.ActivityDtos.ActivityResponse;
import com.h.hiveboard.backend.activity.entity.ActivityEntry;
import com.h.hiveboard.backend.activity.repository.ActivityEntryRepository;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.card.service.CardService;
import com.h.hiveboard.backend.member.entity.BoardMember;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.service.BoardAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

// Reading history: a whole board's, or one card's. Any member may read it; viewers don't
// see anything about cards hidden from them.
@Service
@RequiredArgsConstructor
public class ActivityService {

    private static final int DEFAULT_LIMIT = 30;
    private static final int MAX_LIMIT = 100;

    private final ActivityEntryRepository activityEntryRepository;
    private final BoardAccessService boardAccessService;
    private final CardService cardService;

    @Transactional(readOnly = true)
    public ActivityPageResponse boardActivity(UUID boardId, User user, Long before, Integer limit) {
        BoardMember member = boardAccessService.requireMembership(boardId, user, BoardRole.VIEWER);
        boolean everything = member.getRole() != BoardRole.VIEWER;
        int size = size(limit);
        return page(activityEntryRepository.findBoardPage(boardId, cursor(before), everything,
                PageRequest.of(0, size + 1)), size);
    }

    @Transactional(readOnly = true)
    public ActivityPageResponse cardActivity(UUID cardId, User user, Long before, Integer limit) {
        // 404 for non-members, and for viewers when the card is hidden from them
        Card card = cardService.getCardForRole(cardId, user, BoardRole.VIEWER);
        BoardMember member = boardAccessService.requireMembership(card.getBoardList().getBoard().getId(), user, BoardRole.VIEWER);
        boolean everything = member.getRole() != BoardRole.VIEWER;
        int size = size(limit);
        return page(activityEntryRepository.findCardPage(cardId, cursor(before), everything,
                PageRequest.of(0, size + 1)), size);
    }

    private static long cursor(Long before) {
        return before != null ? before : Long.MAX_VALUE;
    }

    private static int size(Integer limit) {
        return limit == null ? DEFAULT_LIMIT : Math.max(1, Math.min(MAX_LIMIT, limit));
    }

    // Fetched one extra to know whether there's more
    private static ActivityPageResponse page(List<ActivityEntry> entries, int size) {
        boolean hasMore = entries.size() > size;
        return new ActivityPageResponse(
                entries.stream().limit(size).map(ActivityResponse::from).toList(), hasMore);
    }
}
