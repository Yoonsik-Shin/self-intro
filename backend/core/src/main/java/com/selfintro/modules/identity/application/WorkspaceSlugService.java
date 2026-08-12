package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceRepository;
import com.selfintro.modules.identity.domain.WorkspaceSlugAlias;
import com.selfintro.modules.identity.domain.WorkspaceSlugAliasRepository;
import com.selfintro.modules.identity.domain.WorkspaceSlugAliasType;
import com.selfintro.modules.identity.presentation.dto.WorkspaceSlugResolutionResponse;
import com.selfintro.modules.identity.presentation.dto.WorkspaceSlugSettingsResponse;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WorkspaceSlugService {
    public static final int MIN_LENGTH = 3;
    public static final int MAX_LENGTH = 60;
    private static final Pattern VALID_SLUG =
            Pattern.compile("^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$");
    private static final Set<String> RESERVED =
            Set.of(
                    "admin",
                    "api",
                    "app",
                    "architecture",
                    "auth",
                    "demo",
                    "login",
                    "manage",
                    "onboarding",
                    "ops",
                    "signup",
                    "support",
                    "system",
                    "w",
                    "workspace");

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceSlugAliasRepository aliasRepository;

    @Transactional(readOnly = true)
    public Optional<Workspace> resolveActive(String rawSlug) {
        String slug = normalize(rawSlug);
        Optional<Workspace> canonical = workspaceRepository.findBySlug(slug);
        if (canonical.isPresent()) {
            return canonical;
        }
        return aliasRepository
                .findBySlugAndRetiredAtIsNull(slug)
                .flatMap(alias -> workspaceRepository.findById(alias.getWorkspaceId()));
    }

    @Transactional(readOnly = true)
    public WorkspaceSlugResolutionResponse resolution(String requestedSlug, Workspace workspace) {
        return new WorkspaceSlugResolutionResponse(normalize(requestedSlug), workspace.getSlug());
    }

    @Transactional
    public WorkspaceSlugSettingsResponse registerCanonical(Workspace workspace) {
        ensureCanonicalRegistry(workspace);
        return settings(workspace.getId());
    }

    @Transactional(readOnly = true)
    public WorkspaceSlugSettingsResponse settings(Long workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId).orElseThrow();
        return response(workspace);
    }

    @Transactional
    public WorkspaceSlugSettingsResponse changeCanonicalSlug(
            Long workspaceId, String requestedSlug) {
        Workspace workspace = workspaceRepository.findByIdForUpdate(workspaceId).orElseThrow();
        String candidate = validate(requestedSlug);
        if (workspace.getSlug().equals(candidate)) {
            ensureCanonicalRegistry(workspace);
            return response(workspace);
        }

        workspaceRepository
                .findBySlug(candidate)
                .filter(existing -> !existing.getId().equals(workspaceId))
                .ifPresent(existing -> conflict());
        WorkspaceSlugAlias candidateRegistry =
                aliasRepository.findBySlugAndRetiredAtIsNull(candidate).orElse(null);
        if (candidateRegistry != null && !candidateRegistry.getWorkspaceId().equals(workspaceId)) {
            conflict();
        }

        WorkspaceSlugAlias currentRegistry = ensureCanonicalRegistry(workspace);
        currentRegistry.makeAlias();
        aliasRepository.saveAndFlush(currentRegistry);

        if (candidateRegistry == null) {
            aliasRepository.saveAndFlush(WorkspaceSlugAlias.canonical(workspaceId, candidate));
        } else {
            candidateRegistry.makeCanonical();
            aliasRepository.saveAndFlush(candidateRegistry);
        }
        workspace.changeSlug(candidate);
        return response(workspace);
    }

    private WorkspaceSlugAlias ensureCanonicalRegistry(Workspace workspace) {
        WorkspaceSlugAlias current =
                aliasRepository
                        .findByWorkspaceIdAndAliasTypeAndRetiredAtIsNull(
                                workspace.getId(), WorkspaceSlugAliasType.CANONICAL)
                        .orElse(null);
        if (current != null) {
            if (!current.getSlug().equals(workspace.getSlug())) {
                throw new IllegalStateException("Workspace canonical slug registry가 일치하지 않습니다.");
            }
            return current;
        }
        WorkspaceSlugAlias bySlug =
                aliasRepository.findBySlugAndRetiredAtIsNull(workspace.getSlug()).orElse(null);
        if (bySlug != null) {
            if (!bySlug.getWorkspaceId().equals(workspace.getId())) {
                throw new IllegalStateException("Workspace slug registry가 다른 Workspace를 가리킵니다.");
            }
            bySlug.makeCanonical();
            return aliasRepository.saveAndFlush(bySlug);
        }
        return aliasRepository.saveAndFlush(
                WorkspaceSlugAlias.canonical(workspace.getId(), workspace.getSlug()));
    }

    private WorkspaceSlugSettingsResponse response(Workspace workspace) {
        return new WorkspaceSlugSettingsResponse(
                workspace.getSlug(),
                aliasRepository
                        .findAllByWorkspaceIdAndRetiredAtIsNullOrderByCreatedAtDesc(
                                workspace.getId())
                        .stream()
                        .filter(alias -> alias.getAliasType() == WorkspaceSlugAliasType.ALIAS)
                        .map(WorkspaceSlugAlias::getSlug)
                        .toList(),
                MIN_LENGTH,
                MAX_LENGTH);
    }

    private String validate(String rawSlug) {
        String slug = normalize(rawSlug);
        if (slug.length() < MIN_LENGTH
                || slug.length() > MAX_LENGTH
                || !VALID_SLUG.matcher(slug).matches()
                || RESERVED.contains(slug)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "slug는 3~60자의 영문 소문자·숫자·하이픈만 사용할 수 있고 예약어는 사용할 수 없습니다.");
        }
        return slug;
    }

    private String normalize(String slug) {
        return slug == null ? "" : slug.trim().toLowerCase(Locale.ROOT);
    }

    private void conflict() {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 Workspace slug입니다.");
    }
}
