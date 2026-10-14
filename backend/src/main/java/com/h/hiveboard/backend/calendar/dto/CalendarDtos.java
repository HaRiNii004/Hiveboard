package com.h.hiveboard.backend.calendar.dto;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.boardlist.entity.BoardList;
import com.h.hiveboard.backend.card.entity.Card;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public class CalendarDtos {

    public record CalendarUserResponse(Long id, String fullName, String email) {
        static CalendarUserResponse from(User user) {
            return user == null ? null : new CalendarUserResponse(user.getId(), user.getFullName(), user.getEmail());
        }
    }

    // One card on the calendar, with enough of its board and list to show and open it.
    // dueTime is null for an all-day due date.
    public record CalendarCardResponse(UUID id, String title, LocalDate dueDate, LocalTime dueTime,
                                       boolean highPriority, UUID boardId, String boardName,
                                       UUID listId, String listName, CalendarUserResponse assignee) {
        public static CalendarCardResponse from(Card card) {
            BoardList list = card.getBoardList();
            Board board = list.getBoard();
            return new CalendarCardResponse(card.getId(), card.getTitle(), card.getDueDate(), card.getDueTime(),
                    card.isHighPriority(), board.getId(), board.getName(), list.getId(), list.getName(),
                    CalendarUserResponse.from(card.getAssignee()));
        }
    }
}
