package com.h.hiveboard.backend.label.repository;

import com.h.hiveboard.backend.label.entity.Label;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LabelRepository extends JpaRepository<Label, UUID> {
    List<Label> findByBoardIdOrderByCreatedAtAsc(UUID boardId);

    boolean existsByBoardIdAndNameIgnoreCase(UUID boardId, String name);

    boolean existsByBoardIdAndNameIgnoreCaseAndIdNot(UUID boardId, String name, UUID id);

    // Un-assigns a label from every card before the label itself is deleted.
    @Modifying
    @Query(value = "DELETE FROM card_labels WHERE label_id = :labelId", nativeQuery = true)
    void deleteCardAssignments(UUID labelId);
}
