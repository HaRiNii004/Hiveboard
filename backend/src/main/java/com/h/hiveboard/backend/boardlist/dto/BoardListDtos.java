package com.h.hiveboard.backend.boardlist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public class BoardListDtos {

    public record CreateListRequest(@NotBlank String name) {}

    public record UpdateListRequest(@NotBlank String name) {}

    // Frontend sends the FULL ordered array of list ids after a drag —
    // simplest possible contract, no fiddly "insert at index" math server-side.
    public record ReorderListsRequest(@NotEmpty List<UUID> orderedListIds) {}
}
