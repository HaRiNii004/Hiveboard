package com.h.hiveboard.backend.todo.entity;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.entity.Board;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

// One item on a user's personal to-do list ("My Tasks"). Only its owner can ever see
// or change it. It can optionally be linked to a board the owner is a member of.
@Entity
@Table(name = "todo_items",
        indexes = @Index(name = "idx_todo_owner_position", columnList = "owner_id, position"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TodoItem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 500)
    private String text;

    // Optional link to a board. If the board is deleted the database clears the link
    // (the task stays); leaving / being removed from the board clears it too (MemberService).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Board board;

    @Column(nullable = false)
    @Builder.Default
    private boolean done = false;

    // Order within the list (the owner can drag to reorder)
    @Column(nullable = false)
    private Double position;

    @CreationTimestamp
    private Instant createdAt;

    // When it was ticked off (null while still to do)
    private Instant completedAt;
}
