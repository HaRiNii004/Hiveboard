package com.h.hiveboard.backend.member.service;

import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.board.repository.BoardRepository;
import com.h.hiveboard.backend.member.entity.BoardRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// One-time migration for boards created before memberships existed: make each
// board's owner its ADMIN. Safe to run on every startup — it only touches boards
// whose owner has no membership row yet.
@Slf4j
@Component
@RequiredArgsConstructor
public class BoardMembershipBackfill implements ApplicationRunner {

    private final BoardRepository boardRepository;
    private final BoardAccessService boardAccessService;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Board> boards = boardRepository.findBoardsWithoutOwnerMembership();
        for (Board board : boards) {
            boardAccessService.addMember(board, board.getOwner(), BoardRole.ADMIN);
        }
        if (!boards.isEmpty()) {
            log.info("Backfilled ADMIN memberships for {} existing board(s)", boards.size());
        }
    }
}
