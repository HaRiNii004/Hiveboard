package com.h.hiveboard.backend.boardlist.entity;

import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.card.entity.Card;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.OnDelete;
import com.h.hiveboard.backend.auth.entity.User;
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

    // Archived: off the board, but kept (with everything on it) and can be restored.
    // The column default lets Hibernate add it to existing rows.
    @Column(nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean archived = false;

    private Instant archivedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "archived_by_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private User archivedBy;

    @CreationTimestamp
    private Instant createdAt;
}
