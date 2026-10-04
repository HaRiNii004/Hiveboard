package com.h.hiveboard.backend.card.service;

import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.CardResponse;
import com.h.hiveboard.backend.card.dto.CardDtos.CreateCardRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.UpdateCardRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.MoveCardRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.ReorderCardsRequest;
import com.h.hiveboard.backend.boardlist.entity.BoardList;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.card.repository.CardRepository;
import com.h.hiveboard.backend.boardlist.service.BoardListService;
import com.h.hiveboard.backend.label.service.LabelService;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
import com.h.hiveboard.backend.exception.ForbiddenOperationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CardService {

    private final CardRepository cardRepository;
    private final BoardListService boardListService; // reused for its ownership check
    private final LabelService labelService;         // validates label ids belong to the board

    @Transactional
    public CardResponse createCard(UUID listId, User user, CreateCardRequest request) {
        BoardList list = boardListService.getOwnedList(listId, user);

        double nextPosition = cardRepository.findMaxPositionByListId(list.getId()).orElse(0.0) + 1.0;
        Card card = Card.builder()
                .title(request.title())
                .description(request.description())
                .position(nextPosition)
                .boardList(list)
                .labels(labelService.resolveBoardLabels(list.getBoard(), request.labelIds()))
                .build();

        cardRepository.save(card);
        return toResponse(card);
    }

    @Transactional
    public CardResponse updateCard(UUID cardId, User user, UpdateCardRequest request) {
        Card card = getOwnedCard(cardId, user);
        card.setTitle(request.title());
        card.setDescription(request.description());
        if (request.labelIds() != null) {
            card.setLabels(labelService.resolveBoardLabels(card.getBoardList().getBoard(), request.labelIds()));
        }
        cardRepository.save(card);
        return toResponse(card);
    }

    // Dragging a card into a DIFFERENT column: move it to the end of that
    // column, then compact the old column's positions so there's no gap.
    @Transactional
    public CardResponse moveCard(UUID cardId, User user, MoveCardRequest request) {
        Card card = getOwnedCard(cardId, user);
        BoardList targetList = boardListService.getOwnedList(request.targetListId(), user);

        if (!targetList.getBoard().getId().equals(card.getBoardList().getBoard().getId())) {
            throw new ForbiddenOperationException("Cards can only move within the same board");
        }

        BoardList sourceList = card.getBoardList();
        double nextPosition = cardRepository.findMaxPositionByListId(targetList.getId()).orElse(0.0) + 1.0;

        card.setBoardList(targetList);
        card.setPosition(nextPosition);
        cardRepository.save(card);

        if (!sourceList.getId().equals(targetList.getId())) {
            compactPositions(sourceList);
        }

        return toResponse(card);
    }

    // Reordering cards WITHIN the same column — same "send the full ordered
    // array" contract as list reordering, for the same reason: no fiddly
    // insert-at-index math server-side.
    @Transactional
    public void reorderCards(UUID listId, User user, ReorderCardsRequest request) {
        BoardList list = boardListService.getOwnedList(listId, user);

        Map<UUID, Card> byId = new HashMap<>();
        for (Card card : list.getCards()) {
            byId.put(card.getId(), card);
        }

        List<UUID> orderedIds = request.orderedCardIds();
        if (orderedIds.size() != byId.size()) {
            throw new IllegalArgumentException("Reorder must include every card in this list");
        }

        for (int i = 0; i < orderedIds.size(); i++) {
            Card card = byId.get(orderedIds.get(i));
            if (card == null) {
                throw new IllegalArgumentException("Card " + orderedIds.get(i) + " does not belong to this list");
            }
            card.setPosition((double) i);
        }
        cardRepository.saveAll(byId.values());
    }

    @Transactional
    public void deleteCard(UUID cardId, User user) {
        Card card = getOwnedCard(cardId, user);
        BoardList list = card.getBoardList();
        cardRepository.delete(card);
        compactPositions(list);
    }

    private void compactPositions(BoardList list) {
        List<Card> remaining = cardRepository.findByBoardListOrderByPositionAsc(list);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setPosition((double) i);
        }
        cardRepository.saveAll(remaining);
    }

    private Card getOwnedCard(UUID cardId, User user) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("No card with id " + cardId));

        if (!card.getBoardList().getBoard().getOwner().getId().equals(user.getId())) {
            throw new ForbiddenOperationException("You don't have access to this card");
        }
        return card;
    }

    private CardResponse toResponse(Card card) {
        return CardResponse.from(card);
    }
}
