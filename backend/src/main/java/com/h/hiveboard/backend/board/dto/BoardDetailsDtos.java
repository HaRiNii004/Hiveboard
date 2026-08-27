package com.h.hiveboard.backend.board.dto;

import java.util.List;
import java.util.UUID;

// The nested shape for a single board's full view — everything the
// drag-and-drop UI needs in one call: lists, each with its cards, in order.
public class BoardDetailsDtos {

    public record CardResponse(UUID id, String title, String description, Double position) {}

    public record ListResponse(UUID id, String name, Double position, List<CardResponse> cards) {}

    public record BoardDetailResponse(UUID id, String name, String description, List<ListResponse> lists) {}
}
