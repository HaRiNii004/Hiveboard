package com.h.hiveboard.backend.boardlist.entity;

import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.card.entity.Card;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "board_lists")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardList {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double position;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @OneToMany(mappedBy = "boardList", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @Builder.Default
    private List<Card> cards = new ArrayList<>();

    @CreationTimestamp
    private Instant createdAt;
}
