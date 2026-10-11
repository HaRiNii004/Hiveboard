package com.h.hiveboard.backend.member.dto;

import com.h.hiveboard.backend.member.entity.BoardMember;
import com.h.hiveboard.backend.member.entity.BoardRole;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public class MemberDtos {

    public record UpdateMemberRoleRequest(@NotNull BoardRole role) {}

    public record MemberResponse(Long userId, String fullName, String email, BoardRole role, Instant joinedAt) {
        public static MemberResponse from(BoardMember member) {
            return new MemberResponse(member.getUser().getId(), member.getUser().getFullName(),
                    member.getUser().getEmail(), member.getRole(), member.getJoinedAt());
        }
    }
}
