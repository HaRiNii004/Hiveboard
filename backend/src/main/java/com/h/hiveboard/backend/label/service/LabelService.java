package com.h.hiveboard.backend.label.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.board.service.BoardService;
import com.h.hiveboard.backend.exception.ForbiddenOperationException;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
import com.h.hiveboard.backend.label.dto.LabelDtos.CreateLabelRequest;
import com.h.hiveboard.backend.label.dto.LabelDtos.LabelResponse;
import com.h.hiveboard.backend.label.dto.LabelDtos.UpdateLabelRequest;
import com.h.hiveboard.backend.label.entity.Label;
import com.h.hiveboard.backend.label.entity.LabelColor;
import com.h.hiveboard.backend.label.repository.LabelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LabelService {

    private final LabelRepository labelRepository;
    private final BoardService boardService; // reused for its ownership check

    @Transactional(readOnly = true)
    public List<LabelResponse> getLabels(UUID boardId, User user) {
        Board board = boardService.getOwnedBoard(boardId, user);
        return labelRepository.findByBoardIdOrderByCreatedAtAsc(board.getId())
                .stream()
                .map(LabelResponse::from)
                .toList();
    }

    @Transactional
    public LabelResponse createLabel(UUID boardId, User user, CreateLabelRequest request) {
        Board board = boardService.getOwnedBoard(boardId, user);
        String name = request.name().trim();

        if (labelRepository.existsByBoardIdAndNameIgnoreCase(board.getId(), name)) {
            throw new IllegalArgumentException("A label named \"" + name + "\" already exists on this board");
        }

        Label label = Label.builder()
                .name(name)
                .color(request.color() != null ? request.color() : LabelColor.DEFAULT)
                .board(board)
                .build();

        labelRepository.save(label);
        return LabelResponse.from(label);
    }

    @Transactional
    public LabelResponse updateLabel(UUID labelId, User user, UpdateLabelRequest request) {
        Label label = getOwnedLabel(labelId, user);
        String name = request.name().trim();

        if (labelRepository.existsByBoardIdAndNameIgnoreCaseAndIdNot(label.getBoard().getId(), name, label.getId())) {
            throw new IllegalArgumentException("A label named \"" + name + "\" already exists on this board");
        }

        label.setName(name);
        label.setColor(request.color());
        labelRepository.save(label);
        return LabelResponse.from(label);
    }

    @Transactional
    public void deleteLabel(UUID labelId, User user) {
        Label label = getOwnedLabel(labelId, user);
        labelRepository.deleteCardAssignments(label.getId());
        labelRepository.delete(label);
    }

    // Used by CardService: turns the label ids sent with a card into entities,
    // making sure every one of them belongs to the card's board.
    public Set<Label> resolveBoardLabels(Board board, List<UUID> labelIds) {
        if (labelIds == null || labelIds.isEmpty()) {
            return new HashSet<>();
        }

        Set<UUID> uniqueIds = new HashSet<>(labelIds);
        List<Label> labels = labelRepository.findAllById(uniqueIds);

        boolean allOnBoard = labels.stream().allMatch(l -> l.getBoard().getId().equals(board.getId()));
        if (labels.size() != uniqueIds.size() || !allOnBoard) {
            throw new IllegalArgumentException("One or more labels don't exist on this board");
        }
        return new HashSet<>(labels);
    }

    private Label getOwnedLabel(UUID labelId, User user) {
        Label label = labelRepository.findById(labelId)
                .orElseThrow(() -> new ResourceNotFoundException("No label with id " + labelId));

        if (!label.getBoard().getOwner().getId().equals(user.getId())) {
            throw new ForbiddenOperationException("You don't have access to this label");
        }
        return label;
    }
}
