package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.*;
import com.selfintro.modules.taxonomy.application.TaxonomySchemeService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(0)
@RequiredArgsConstructor
@ConditionalOnProperty(
        name = "app.security.bootstrap-admin.enabled",
        havingValue = "true",
        matchIfMissing = false)
public class BootstrapOwnerService implements ApplicationRunner {

    private final AppUserRepository appUserRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceSlugService workspaceSlugService;
    private final UserPlatformRoleRepository platformRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final TaxonomySchemeService taxonomySchemeService;

    @Value("${app.admin.username:}")
    private String username;

    @Value("${app.admin.password:}")
    private String rawPassword;

    @Value("${app.admin.password-hash:}")
    private String passwordHash;

    @Value("${app.admin.display-name:Platform Owner}")
    private String displayName;

    @Value("${app.public-workspace-slug:w-199d6de326de71385a98}")
    private String bootstrapWorkspaceSlug;

    @Value("${app.admin.workspace-name:경력 관리 워크스페이스}")
    private String bootstrapWorkspaceName;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (username.isBlank()) {
            throw new IllegalStateException(
                    "BOOTSTRAP_ADMIN_ENABLED=true이면 ADMIN_USERNAME이 필요합니다.");
        }
        if (appUserRepository.findByLoginId(username).isPresent()) {
            return;
        }
        String encodedPassword = resolvePasswordHash();
        AppUser user =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                username.trim(), encodedPassword, displayName.trim(), null));
        Workspace workspace =
                workspaceRepository
                        .findBySlug(bootstrapWorkspaceSlug)
                        .map(
                                existing -> {
                                    existing.rename(bootstrapWorkspaceName.trim());
                                    return workspaceRepository.save(existing);
                                })
                        .orElseGet(
                                () ->
                                        workspaceRepository.save(
                                                Workspace.createPersonal(
                                                        bootstrapWorkspaceName.trim(),
                                                        bootstrapWorkspaceSlug)));
        workspaceSlugService.registerCanonical(workspace);
        workspaceMemberRepository.save(WorkspaceMember.owner(workspace, user));
        taxonomySchemeService.ensureDefaultSubscription(workspace.getId());
        platformRoleRepository.save(UserPlatformRole.owner(user));
    }

    private String resolvePasswordHash() {
        if (!passwordHash.isBlank()) {
            return passwordHash.trim();
        }
        if (!rawPassword.isBlank()) {
            return passwordEncoder.encode(rawPassword);
        }
        throw new IllegalStateException(
                "ADMIN_PASSWORD 또는 ADMIN_PASSWORD_HASH 환경변수 중 하나는 반드시 설정해야 합니다.");
    }
}
