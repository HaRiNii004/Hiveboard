package com.h.hiveboard.backend.notification.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.comment.entity.Comment;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
import com.h.hiveboard.backend.member.entity.BoardMember;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.repository.BoardMemberRepository;
import com.h.hiveboard.backend.notification.dto.NotificationDtos.NotificationResponse;
import com.h.hiveboard.backend.notification.dto.NotificationDtos.NotificationsResponse;
import com.h.hiveboard.backend.notification.entity.Notification;
import com.h.hiveboard.backend.notification.entity.NotificationType;
import com.h.hiveboard.backend.notification.repository.NotificationRepository;
import com.h.hiveboard.backend.realtime.event.NotificationCreated;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

// Creates notifications for the events other services report, and serves the
// current user's notifications. Notifications are written in the same transaction
// as the action, so a failed action never leaves a notification behind.
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int SNIPPET_LENGTH = 80;

    private final NotificationRepository notificationRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final ApplicationEventPublisher applicationEventPublisher;

    // ---------- Events ----------

    // A card was assigned to someone (not themselves).
    public void cardAssigned(Card card, User actor) {
        User assignee = card.getAssignee();
        if (assignee == null || !canSeeCard(card, assignee)) return;

        String priority = card.isHighPriority() ? "high-priority " : "";
        send(assignee, actor, NotificationType.CARD_ASSIGNED,
                actor.getFullName() + " assigned you to the " + priority + "card \"" + card.getTitle()
                        + "\" on " + boardOf(card).getName(),
                boardOf(card).getId(), card.getId());
    }

    // A card was flagged high priority: tell whoever it's assigned to.
    public void cardFlagged(Card card, User actor) {
        User assignee = card.getAssignee();
        if (assignee == null || !canSeeCard(card, assignee)) return;

        send(assignee, actor, NotificationType.CARD_FLAGGED,
                actor.getFullName() + " flagged \"" + card.getTitle() + "\" as high priority on "
                        + boardOf(card).getName(),
                boardOf(card).getId(), card.getId());
    }

    // Someone replied: tell the authors of the comment they replied to and of the thread's
    // first comment (once each).
    public void commentReplied(Comment reply, Collection<User> authorsRepliedTo, User actor) {
        Card card = reply.getCard();
        Map<Long, User> recipients = new LinkedHashMap<>();
        authorsRepliedTo.stream().filter(Objects::nonNull).forEach(u -> recipients.putIfAbsent(u.getId(), u));

        String message = actor.getFullName() + " replied to your comment on \"" + card.getTitle() + "\": "
                + snippet(reply.getText());
        for (User recipient : recipients.values()) {
            if (canSeeCard(card, recipient)) {
                send(recipient, actor, NotificationType.COMMENT_REPLY, message, boardOf(card).getId(), card.getId());
            }
        }
    }

    // Someone @mentioned people in a comment (or reply): tell each of them.
    public void commentMentioned(Comment comment, Collection<User> mentioned, User actor) {
        Card card = comment.getCard();
        String message = actor.getFullName() + " mentioned you on \"" + card.getTitle() + "\": "
                + snippet(comment.getText());
        for (User recipient : mentioned) {
            if (canSeeCard(card, recipient)) {
                send(recipient, actor, NotificationType.COMMENT_MENTION, message, boardOf(card).getId(), card.getId());
            }
        }
    }

    // Someone joined a board: tell everyone else on it.
    public void memberJoined(Board board, User newMember) {
        for (User member : otherMembers(board, newMember)) {
            send(member, newMember, NotificationType.MEMBER_JOINED,
                    newMember.getFullName() + " joined " + board.getName(), board.getId(), null);
        }
    }

    // Someone left a board: tell everyone still on it.
    public void memberLeft(Board board, User leaver) {
        for (User member : otherMembers(board, leaver)) {
            send(member, leaver, NotificationType.MEMBER_LEFT,
                    leaver.getFullName() + " left " + board.getName(), board.getId(), null);
        }
    }

    // An admin removed someone: tell the person who was removed.
    public void memberRemoved(Board board, User removed, User admin) {
        send(removed, admin, NotificationType.MEMBER_REMOVED,
                admin.getFullName() + " removed you from " + board.getName(), board.getId(), null);
    }

    // ---------- Reading ----------

    // Latest notifications (or only those newer than `after`, when polling) plus the unread count.
    @Transactional(readOnly = true)
    public NotificationsResponse getNotifications(User user, Instant after) {
        List<Notification> notifications = after == null
                ? notificationRepository.findTop50ByRecipientIdOrderByCreatedAtDesc(user.getId())
                : notificationRepository.findTop50ByRecipientIdAndCreatedAtAfterOrderByCreatedAtDesc(user.getId(), after);

        return new NotificationsResponse(
                notifications.stream().map(NotificationResponse::from).toList(),
                notificationRepository.countByRecipientIdAndReadFalse(user.getId()));
    }

    @Transactional
    public NotificationResponse markRead(UUID notificationId, User user) {
        Notification notification = notificationRepository.findByIdAndRecipientId(notificationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No notification with id " + notificationId));
        notification.setRead(true);
        return NotificationResponse.from(notification);
    }

    @Transactional
    public void markAllRead(User user) {
        notificationRepository.markAllRead(user.getId());
    }

    // ---------- helpers ----------

    // Never notify people about their own actions.
    private void send(User recipient, User actor, NotificationType type, String message, UUID boardId, UUID cardId) {
        if (actor != null && recipient.getId().equals(actor.getId())) return;

        Notification notification = notificationRepository.saveAndFlush(Notification.builder()
                .recipient(recipient)
                .actor(actor)
                .type(type)
                .message(message)
                .boardId(boardId)
                .cardId(cardId)
                .build());
        // Pushed over the WebSocket after commit (polling remains as a fallback)
        applicationEventPublisher.publishEvent(
                new NotificationCreated(recipient.getEmail(), NotificationResponse.from(notification)));
    }

    // Viewers must not learn about cards hidden from them, not even the title.
    private boolean canSeeCard(Card card, User user) {
        if (!card.isHiddenFromViewers()) return true;
        return boardMemberRepository.findByBoardIdAndUserId(boardOf(card).getId(), user.getId())
                .map(member -> member.getRole() != BoardRole.VIEWER)
                .orElse(false);
    }

    private List<User> otherMembers(Board board, User except) {
        return boardMemberRepository.findByBoardIdOrderByJoinedAtAsc(board.getId()).stream()
                .map(BoardMember::getUser)
                .filter(u -> !u.getId().equals(except.getId()))
                .toList();
    }

    private static Board boardOf(Card card) {
        return card.getBoardList().getBoard();
    }

    private static String snippet(String text) {
        String oneLine = text.replaceAll("\\s+", " ").trim();
        return "\"" + (oneLine.length() > SNIPPET_LENGTH ? oneLine.substring(0, SNIPPET_LENGTH) + "…" : oneLine) + "\"";
    }
}
