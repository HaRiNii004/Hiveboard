package com.h.hiveboard.backend.label.dto;

import com.h.hiveboard.backend.label.entity.Label;
import com.h.hiveboard.backend.label.entity.LabelColor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public class LabelDtos {

    // color is optional on create — defaults to DEFAULT (plain grey chip).
    public record CreateLabelRequest(@NotBlank @Size(max = 50) String name, LabelColor color) {}

    public record UpdateLabelRequest(@NotBlank @Size(max = 50) String name, @NotNull LabelColor color) {}

    public record LabelResponse(UUID id, String name, LabelColor color) {
        public static LabelResponse from(Label label) {
            return new LabelResponse(label.getId(), label.getName(), label.getColor());
        }
    }
}
