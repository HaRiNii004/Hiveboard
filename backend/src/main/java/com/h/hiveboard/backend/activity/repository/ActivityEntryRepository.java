package com.h.hiveboard.backend.activity.repository;

import com.h.hiveboard.backend.activity.entity.ActivityEntry;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ActivityEntryRepository extends JpaRepository<ActivityEntry, Long> {

    // Newest first, older than `beforeId`. everything = false (viewers): leaves out entries
    // recorded as members-only and anything about a card that is hidden from viewers now.
    @Query("SELECT a FROM ActivityEntry a WHERE a.board.id = :boardId AND a.id < :beforeId "
            + "AND (:everything = true OR (a.membersOnly = false AND (a.cardId IS NULL OR NOT EXISTS "
            + "(SELECT c FROM Card c WHERE c.id = a.cardId AND c.hiddenFromViewers = true)))) "
            + "ORDER BY a.id DESC")
    List<ActivityEntry> findBoardPage(UUID boardId, long beforeId, boolean everything, Pageable page);

    // One card's history (the caller has already checked the card is visible to them)
    @Query("SELECT a FROM ActivityEntry a WHERE a.cardId = :cardId AND a.id < :beforeId "
            + "AND (:everything = true OR a.membersOnly = false) ORDER BY a.id DESC")
    List<ActivityEntry> findCardPage(UUID cardId, long beforeId, boolean everything, Pageable page);
}
