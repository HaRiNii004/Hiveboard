package com.h.hiveboard.backend.member.entity;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.entity.Board;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

// Join entity between users and boards. The role lives here (not on User),
// so someone can be an Admin on one board and a Viewer on another.
// All board permissions come from these rows — Board.owner is only "created by".
@Entity
@Table(name = "board_members",
        uniqueConstraints = @UniqueConstraint(name = "uk_board_member", columnNames = {"board_id", "user_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardMember {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BoardRole role;

    @CreationTimestamp
    private Instant joinedAt;
}
