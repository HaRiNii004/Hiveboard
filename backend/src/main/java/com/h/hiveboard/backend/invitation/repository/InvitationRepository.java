package com.h.hiveboard.backend.invitation.repository;

import com.h.hiveboard.backend.invitation.entity.Invitation;
import com.h.hiveboard.backend.invitation.entity.InvitationStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, UUID> {

    @EntityGraph(attributePaths = {"board", "invitedBy"})
    Optional<Invitation> findByTokenHash(String tokenHash);

    @EntityGraph(attributePaths = "invitedBy")
    List<Invitation> findByBoardIdAndStatusOrderByCreatedAtDesc(UUID boardId, InvitationStatus status);

    List<Invitation> findByBoardIdAndEmailAndStatus(UUID boardId, String email, InvitationStatus status);
}
