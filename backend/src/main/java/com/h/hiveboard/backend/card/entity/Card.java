package com.h.hiveboard.backend.card.entity;

import com.h.hiveboard.backend.auth.entity.User;
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
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
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

    // Who the card's task is assigned to (a member of the board), if anyone.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    // Set automatically to whoever last set or changed the assignee.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by_id")
    private User assignedBy;

    private Instant assignedAt;

    // Flagged cards are shown at the top of their list (see CardResponse.inDisplayOrder).
    // The column default lets Hibernate add it to existing rows.
    @Column(nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean highPriority = false;

    // When it was flagged: the most recently flagged card goes first.
    private Instant flaggedAt;

    // When true, members with the VIEWER role can't see this card at all
    // (left out of the board and 404 on direct access).
    @Column(nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean hiddenFromViewers = false;

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

    // Optimistic locking: bumped on every save. Clients send back the version they
    // loaded, so a stale edit gets a 409 instead of silently overwriting someone else.
    // The column default lets Hibernate add it to existing rows.
    @Version
    @Column(columnDefinition = "bigint default 0")
    private Long version;

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
