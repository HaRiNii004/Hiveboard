package com.h.hiveboard.backend.archive.service;

import com.h.hiveboard.backend.archive.dto.ArchiveDtos.ArchiveResponse;
import com.h.hiveboard.backend.archive.dto.ArchiveDtos.ArchivedCardResponse;
import com.h.hiveboard.backend.archive.dto.ArchiveDtos.ArchivedListResponse;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.CardResponse;
import com.h.hiveboard.backend.boardlist.repository.BoardListRepository;
import com.h.hiveboard.backend.card.repository.CardRepository;
import com.h.hiveboard.backend.member.entity.BoardMember;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.service.BoardAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

// A board's archive: the cards and lists taken off the board, most recent first.
// Any member can look (viewers don't see cards hidden from them); restoring and
// deleting are on CardService / BoardListService.
@Service
@RequiredArgsConstructor
public class ArchiveService {

    private final BoardAccessService boardAccessService;
    private final CardRepository cardRepository;
    private final BoardListRepository boardListRepository;

    @Transactional(readOnly = true)
    public ArchiveResponse getArchive(UUID boardId, User user) {
        BoardMember member = boardAccessService.requireMembership(boardId, user, BoardRole.VIEWER);
        boolean viewer = member.getRole() == BoardRole.VIEWER;

        List<ArchivedCardResponse> cards = cardRepository.findArchivedByBoardId(boardId).stream()
                .filter(card -> !viewer || !card.isHiddenFromViewers())
                .map(card -> new ArchivedCardResponse(CardResponse.from(card), card.getBoardList().getId(),
                        card.getBoardList().getName(), card.getBoardList().isArchived(), card.getArchivedAt(),
                        card.getArchivedBy() != null ? card.getArchivedBy().getFullName() : null))
                .toList();

        List<ArchivedListResponse> lists = boardListRepository.findArchivedByBoardId(boardId).stream()
                .map(list -> new ArchivedListResponse(list.getId(), list.getName(),
                        list.getCards().stream()
                                .filter(card -> !card.isArchived())
                                .filter(card -> !viewer || !card.isHiddenFromViewers())
                                .count(),
                        list.getArchivedAt(),
                        list.getArchivedBy() != null ? list.getArchivedBy().getFullName() : null))
                .toList();

        return new ArchiveResponse(cards, lists);
    }
}
