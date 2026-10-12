package com.h.hiveboard.backend.card.controller;

import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.CardResponse;
import com.h.hiveboard.backend.card.dto.CardDtos.CreateCardRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.UpdateCardRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.MoveCardRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.SetPriorityRequest;
import com.h.hiveboard.backend.card.dto.CardDtos.ReorderCardsRequest;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.card.service.CardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;

    @PostMapping("/api/lists/{listId}/cards")
    public ResponseEntity<CardResponse> create(@AuthenticationPrincipal User user,
                                               @PathVariable UUID listId,
                                               @Valid @RequestBody CreateCardRequest request) {
        return ResponseEntity.ok(cardService.createCard(listId, user, request));
    }

    @PatchMapping("/api/lists/{listId}/cards/reorder")
    public ResponseEntity<Void> reorder(@AuthenticationPrincipal User user,
                                        @PathVariable UUID listId,
                                        @Valid @RequestBody ReorderCardsRequest request) {
        cardService.reorderCards(listId, user, request);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/api/cards/{cardId}")
    public ResponseEntity<CardResponse> update(@AuthenticationPrincipal User user,
                                               @PathVariable UUID cardId,
                                               @Valid @RequestBody UpdateCardRequest request) {
        return ResponseEntity.ok(cardService.updateCard(cardId, user, request));
    }

    // Dragging a card into a different column.
    // Copy a card (placed right below the original)
    @PostMapping("/api/cards/{cardId}/duplicate")
    public ResponseEntity<CardResponse> duplicate(@AuthenticationPrincipal User user, @PathVariable UUID cardId) {
        return ResponseEntity.ok(cardService.duplicateCard(cardId, user));
    }

    @PatchMapping("/api/cards/{cardId}/move")
    public ResponseEntity<CardResponse> move(@AuthenticationPrincipal User user,
                                             @PathVariable UUID cardId,
                                             @Valid @RequestBody MoveCardRequest request) {
        return ResponseEntity.ok(cardService.moveCard(cardId, user, request));
    }

    // Flag / unflag as high priority
    @PatchMapping("/api/cards/{cardId}/priority")
    public ResponseEntity<CardResponse> setPriority(@AuthenticationPrincipal User user,
                                                    @PathVariable UUID cardId,
                                                    @Valid @RequestBody SetPriorityRequest request) {
        return ResponseEntity.ok(cardService.setPriority(cardId, user, request));
    }

    @DeleteMapping("/api/cards/{cardId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable UUID cardId) {
        cardService.deleteCard(cardId, user);
        return ResponseEntity.noContent().build();
    }
}
