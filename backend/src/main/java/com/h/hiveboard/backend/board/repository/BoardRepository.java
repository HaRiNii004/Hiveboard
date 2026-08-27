package com.h.hiveboard.backend.board.repository;

import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BoardRepository extends JpaRepository<Board, UUID> {
    List<Board> findByOwnerOrderByCreatedAtDesc(User owner);
}
