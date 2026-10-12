package com.h.hiveboard.backend.label.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.service.BoardAccessService;
import com.h.hiveboard.backend.realtime.service.BoardEventPublisher;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.LabelPayload;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.LabelDeletedPayload;
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
    private final BoardAccessService boardAccessService; // role checks
    private final BoardEventPublisher boardEventPublisher;

    @Transactional(readOnly = true)
    public List<LabelResponse> getLabels(UUID boardId, User user) {
        Board board = boardAccessService.requireRole(boardId, user, BoardRole.VIEWER);
        return labelRepository.findByBoardIdOrderByCreatedAtAsc(board.getId())
                .stream()
                .map(LabelResponse::from)
                .toList();
    }

    @Transactional
    public LabelResponse createLabel(UUID boardId, User user, CreateLabelRequest request) {
        Board board = boardAccessService.requireRole(boardId, user, BoardRole.MEMBER);
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
        LabelResponse response = LabelResponse.from(label);
        boardEventPublisher.publish(board.getId(), "LABEL_CREATED", user, new LabelPayload(response));
        return response;
    }

    @Transactional
    public LabelResponse updateLabel(UUID labelId, User user, UpdateLabelRequest request) {
        Label label = getLabelForMember(labelId, user);
        String name = request.name().trim();

        if (labelRepository.existsByBoardIdAndNameIgnoreCaseAndIdNot(label.getBoard().getId(), name, label.getId())) {
            throw new IllegalArgumentException("A label named \"" + name + "\" already exists on this board");
        }

        label.setName(name);
        label.setColor(request.color());
        labelRepository.save(label);
        LabelResponse response = LabelResponse.from(label);
        boardEventPublisher.publish(label.getBoard().getId(), "LABEL_UPDATED", user, new LabelPayload(response));
        return response;
    }

    @Transactional
    public void deleteLabel(UUID labelId, User user) {
        Label label = getLabelForMember(labelId, user);
        UUID boardId = label.getBoard().getId();
        labelRepository.deleteCardAssignments(label.getId());
        labelRepository.delete(label);
        boardEventPublisher.publish(boardId, "LABEL_DELETED", user, new LabelDeletedPayload(labelId));
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

    // Managing label options is something Members may do.
    private Label getLabelForMember(UUID labelId, User user) {
        Label label = labelRepository.findById(labelId)
                .orElseThrow(() -> new ResourceNotFoundException("No label with id " + labelId));

        boardAccessService.requireRole(label.getBoard().getId(), user, BoardRole.MEMBER);
        return label;
    }
}
