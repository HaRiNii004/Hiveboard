package com.h.hiveboard.backend.member.controller;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.member.dto.MemberDtos.MemberResponse;
import com.h.hiveboard.backend.member.dto.MemberDtos.UpdateMemberRoleRequest;
import com.h.hiveboard.backend.member.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/boards/{boardId}/members")
public class MemberController {

    private final MemberService memberService;

    // Any member
    @GetMapping
    public ResponseEntity<List<MemberResponse>> getMembers(@AuthenticationPrincipal User user,
                                                           @PathVariable UUID boardId) {
        return ResponseEntity.ok(memberService.getMembers(boardId, user));
    }

    // Admin only
    @PatchMapping("/{userId}")
    public ResponseEntity<MemberResponse> changeRole(@AuthenticationPrincipal User user,
                                                     @PathVariable UUID boardId,
                                                     @PathVariable Long userId,
                                                     @Valid @RequestBody UpdateMemberRoleRequest request) {
        return ResponseEntity.ok(memberService.changeRole(boardId, userId, user, request));
    }

    // Admin removes someone, or any member removes themselves (leave)
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal User user,
                                       @PathVariable UUID boardId,
                                       @PathVariable Long userId) {
        memberService.removeMember(boardId, userId, user);
        return ResponseEntity.noContent().build();
    }
}
