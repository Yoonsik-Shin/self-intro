package com.selfintro.modules.identity.application;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.identity.domain.MembershipStatus;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceMemberRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Transitional resolver for legacy endpoints until workspaceId becomes part of every route. */
@Service
@RequiredArgsConstructor
public class CurrentWorkspaceService {

    private final WorkspaceMemberRepository workspaceMemberRepository;

    @Transactional(readOnly = true)
    public WorkspaceMember requireDefaultMembership(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        List<WorkspaceMember> memberships =
                workspaceMemberRepository.findAllByUserIdAndStatus(
                        principal.userId(), MembershipStatus.ACTIVE);
        if (memberships.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 가능한 Workspace가 없습니다.");
        }
        if (memberships.size() != 1) {
            // 여러 Workspace 중 임의의 첫 행을 고르면 다른 tenant의 데이터를 읽거나 쓸 수 있다.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Workspace가 명시된 경로를 사용해야 합니다.");
        }
        return memberships.getFirst();
    }
}
