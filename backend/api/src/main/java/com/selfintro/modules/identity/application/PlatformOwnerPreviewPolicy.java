package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.PlatformRole;
import com.selfintro.modules.identity.domain.UserPlatformRoleRepository;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceRepository;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PlatformOwnerPreviewPolicy {

    private final UserPlatformRoleRepository platformRoleRepository;
    private final WorkspaceRepository workspaceRepository;
    private final boolean enabled;
    private final Set<String> workspaceSlugs;

    public PlatformOwnerPreviewPolicy(
            UserPlatformRoleRepository platformRoleRepository,
            WorkspaceRepository workspaceRepository,
            @Value("${app.private-beta.platform-owner-preview.enabled:false}") boolean enabled,
            @Value("${app.private-beta.platform-owner-preview.workspace-slugs:}")
                    String workspaceSlugs) {
        this.platformRoleRepository = platformRoleRepository;
        this.workspaceRepository = workspaceRepository;
        this.enabled = enabled;
        this.workspaceSlugs = parseSlugs(workspaceSlugs);
    }

    public boolean isAllowed(Long actorUserId, Long workspaceId) {
        return isWorkspaceAllowed(workspaceId)
                && actorUserId != null
                && platformRoleRepository.existsByUserIdAndRole(
                        actorUserId, PlatformRole.PLATFORM_OWNER);
    }

    public boolean isWorkspaceAllowed(Long workspaceId) {
        if (!enabled || workspaceId == null || workspaceSlugs.isEmpty()) {
            return false;
        }
        return workspaceRepository
                .findById(workspaceId)
                .map(Workspace::getSlug)
                .map(PlatformOwnerPreviewPolicy::normalizeSlug)
                .filter(workspaceSlugs::contains)
                .isPresent();
    }

    public List<Long> allowedWorkspaceIds() {
        if (!enabled) {
            return List.of();
        }
        return workspaceSlugs.stream()
                .map(workspaceRepository::findBySlug)
                .flatMap(java.util.Optional::stream)
                .map(Workspace::getId)
                .toList();
    }

    private static Set<String> parseSlugs(String configured) {
        Set<String> parsed = new LinkedHashSet<>();
        Arrays.stream(configured.split(","))
                .map(PlatformOwnerPreviewPolicy::normalizeSlug)
                .filter(value -> !value.isBlank())
                .forEach(parsed::add);
        return Set.copyOf(parsed);
    }

    private static String normalizeSlug(String slug) {
        return slug == null ? "" : slug.trim().toLowerCase(Locale.ROOT);
    }
}
