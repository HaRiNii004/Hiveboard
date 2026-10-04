package com.h.hiveboard.backend.label.entity;

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

// One option of a board's multi-select "Labels" field (like a Notion select option).
// Options belong to the board so every card on it picks from the same set.
@Entity
@Table(name = "labels")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Label {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private LabelColor color = LabelColor.DEFAULT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @CreationTimestamp
    private Instant createdAt;
}
