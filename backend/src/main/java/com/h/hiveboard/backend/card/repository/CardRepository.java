package com.h.hiveboard.backend.card.repository;

import com.h.hiveboard.backend.boardlist.entity.BoardList;
import com.h.hiveboard.backend.card.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CardRepository extends JpaRepository<Card, UUID> {
    List<Card> findByBoardListOrderByPositionAsc(BoardList boardList);

    @Query("SELECT MAX(c.position) FROM Card c WHERE c.boardList.id = :listId")
    Optional<Double> findMaxPositionByListId(UUID listId);
}
