package com.h.hiveboard.backend.activity.entity;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.entity.Board;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

// One line of a board's history: "Alice moved {card} from To do to Done".
// `message` is written when the change happens (it knows the before/after values), with
// "{card}" where the card goes, so a board feed can show the card's title and a card's
// own history can say "this card". The card's title is copied in, and the card is only
// referenced by id (no foreign key), so history survives the card being renamed or deleted.
@Entity
@Table(name = "board_activity", indexes = {
        @Index(name = "idx_activity_board", columnList = "board_id, id"),
        @Index(name = "idx_activity_card", columnList = "card_id, id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityEntry {
    // Increasing, so it's also the order (and the "load older" cursor)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Deleted with the board
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Board board;

    @Column(name = "card_id")
    private UUID cardId;

    private String cardTitle;

    // Kept as a name too, so entries still read well if the account is deleted
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private User actor;

    private String actorName;

    @Convert(converter = ActivityTypeConverter.class)
    @Column(nullable = false, length = 40)
    private ActivityType type;

    @Column(nullable = false, length = 1000)
    private String message;

    // About a card hidden from viewers at the time: viewers never see it
    @Column(nullable = false)
    private boolean membersOnly;

    @Column(nullable = false)
    private Instant createdAt;
}
