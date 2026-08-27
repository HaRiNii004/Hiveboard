package com.h.hiveboard.backend.boardlist.repository;

import com.h.hiveboard.backend.boardlist.entity.BoardList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BoardListRepository extends JpaRepository<BoardList, UUID> {
    List<BoardList> findByBoardIdOrderByPositionAsc(UUID boardId);

    @Query("SELECT MAX(l.position) FROM BoardList l WHERE l.board.id = :boardId")
    Optional<Double> findMaxPositionByBoardId(UUID boardId);
}
