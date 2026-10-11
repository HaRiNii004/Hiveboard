package com.h.hiveboard.backend.card.entity;

import com.h.hiveboard.backend.boardlist.entity.BoardList;
import com.h.hiveboard.backend.comment.entity.Comment;
import com.h.hiveboard.backend.label.entity.Label;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "cards")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Card {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Optional due day, e.g. 2026-10-15.
    private LocalDate dueDate;

    // Optional time on the due day, e.g. 14:30 (only set together with dueDate).
    private LocalTime dueTime;

    @Column(nullable = false)
    private Double position;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "list_id", nullable = false)
    private BoardList boardList;

    // Selected options of the board's labels field (multi-select).
    @ManyToMany
    @JoinTable(name = "card_labels",
            joinColumns = @JoinColumn(name = "card_id"),
            inverseJoinColumns = @JoinColumn(name = "label_id"))
    @Builder.Default
    private Set<Label> labels = new HashSet<>();

    // Deleted along with the card. Only counted for the board view (batch-loaded
    // so a board with many cards doesn't run one query per card).
    @OneToMany(mappedBy = "card", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 50)
    @Builder.Default
    private List<Comment> comments = new ArrayList<>();

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
