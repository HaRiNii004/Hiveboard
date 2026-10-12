package com.h.hiveboard.backend.realtime.dto;

import java.util.List;
import java.util.UUID;

public class RealtimeDtos {

    // From a client: where its pointer is, in board-content coordinates
    // (so scrolling and window size don't matter). visible=false when it leaves the board.
    public record CursorMessage(Double x, Double y, Boolean visible) {}

    // To everyone on the board. Identity and colour come from the server, never the client.
    public record CursorBroadcast(Long userId, String fullName, String color, double x, double y, boolean visible) {}

    public record PresenceUser(Long userId, String fullName, String color) {}

    // Who's looking at the board right now (one entry per person, however many tabs)
    public record PresenceResponse(UUID boardId, List<PresenceUser> users) {}
}
