package com.selfintro.modules.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.SelfIntroApplication;
import com.selfintro.bff.application.BffService;
import com.selfintro.bff.application.IntroductionChannel;
import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.competency.domain.entity.Competency;
import com.selfintro.modules.competency.domain.repository.CompetencyRepository;
import com.selfintro.modules.identity.application.CurrentWorkspaceService;
import com.selfintro.modules.identity.application.EmailVerificationSender;
import com.selfintro.modules.identity.application.InvitationEmailSender;
import com.selfintro.modules.identity.application.InvitationRetentionService;
import com.selfintro.modules.identity.application.RegistrationSecretHasher;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.application.WorkspaceLifecycleService;
import com.selfintro.modules.identity.application.WorkspaceMembershipInvitationEmailSender;
import com.selfintro.modules.identity.application.WorkspaceMembershipService;
import com.selfintro.modules.identity.application.WorkspacePurgeService;
import com.selfintro.modules.identity.application.WorkspaceSlugService;
import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.identity.domain.EmailVerificationToken;
import com.selfintro.modules.identity.domain.EmailVerificationTokenRepository;
import com.selfintro.modules.identity.domain.RegistrationInvitation;
import com.selfintro.modules.identity.domain.RegistrationInvitationRepository;
import com.selfintro.modules.identity.domain.UserStatus;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceMemberRepository;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitation;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitationRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpointRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeJobRepository;
import com.selfintro.modules.identity.domain.WorkspaceRepository;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.identity.domain.WorkspaceSlugAliasRepository;
import com.selfintro.modules.identity.domain.WorkspaceStatus;
import com.selfintro.modules.identity.publication.application.WorkspacePublicationService;
import com.selfintro.modules.identity.publication.domain.PublicationOperationType;
import com.selfintro.modules.identity.publication.domain.WorkspacePublicationRevisionRepository;
import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionBasis;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionReviewStatus;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.learningresource.domain.repository.LearningResourceRepository;
import com.selfintro.modules.profile.application.ProfileService;
import com.selfintro.modules.profile.presentation.dto.ProfileRequest;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import com.selfintro.modules.securityaudit.domain.SecurityAuditEventRepository;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.entity.WorkspaceSkill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import com.selfintro.modules.skill.domain.repository.WorkspaceSkillRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

@SpringBootTest(
        classes = SelfIntroApplication.class,
        properties = {
            "app.admin.username=test-owner",
            "app.admin.password=test-password",
            "app.admin.display-name=Test Owner",
            "app.admin.workspace-name=Test Workspace",
            "app.security.bootstrap-admin.enabled=true",
            "spring.flyway.enabled=false",
            "spring.jpa.hibernate.ddl-auto=create-drop"
        })
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(SaasSecurityFoundationIntegrationTest.RegistrationTestConfig.class)
class SaasSecurityFoundationIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private AppUserRepository appUserRepository;
    @Autowired private WorkspaceMemberRepository workspaceMemberRepository;

    @Autowired
    private WorkspaceMembershipInvitationRepository workspaceMembershipInvitationRepository;

    @Autowired private WorkspaceAccessPolicy workspaceAccessPolicy;
    @Autowired private CurrentWorkspaceService currentWorkspaceService;
    @Autowired private WorkspaceLifecycleService workspaceLifecycleService;
    @Autowired private WorkspaceMembershipService workspaceMembershipService;
    @Autowired private WorkspacePurgeService workspacePurgeService;
    @Autowired private WorkspaceSlugService workspaceSlugService;
    @Autowired private WorkspaceSlugAliasRepository workspaceSlugAliasRepository;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspacePurgeJobRepository workspacePurgeJobRepository;
    @Autowired private WorkspacePurgeCheckpointRepository workspacePurgeCheckpointRepository;
    @Autowired private SecurityAuditEventRepository auditEventRepository;
    @Autowired private RequestMappingHandlerMapping requestMappingHandlerMapping;
    @MockitoSpyBean private SecurityAuditService securityAuditService;
    @Autowired private RegistrationInvitationRepository invitationRepository;
    @Autowired private EmailVerificationTokenRepository emailVerificationTokenRepository;
    @Autowired private InvitationRetentionService invitationRetentionService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private RegistrationSecretHasher registrationSecretHasher;
    @Autowired private CapturingEmailVerificationSender emailVerificationSender;
    @Autowired private CapturingInvitationEmailSender invitationEmailSender;

    @Autowired
    private CapturingWorkspaceMembershipInvitationEmailSender workspaceInvitationEmailSender;

    @Autowired private ObjectMapper objectMapper;
    @Autowired private BffService bffService;
    @Autowired private SkillRepository skillRepository;
    @Autowired private WorkspaceSkillRepository workspaceSkillRepository;
    @Autowired private CompetencyRepository competencyRepository;
    @Autowired private LearningResourceRepository learningResourceRepository;
    @Autowired private JobPostingRepository jobPostingRepository;
    @Autowired private WorkspacePublicationService workspacePublicationService;

    @Autowired
    private WorkspacePublicationRevisionRepository workspacePublicationRevisionRepository;

    @Autowired private ProfileService profileService;

    @Test
    void bootstrapOwnerCanLoginAndReceivesPersonalWorkspaceAndPlatformRole() throws Exception {
        MockHttpSession session =
                (MockHttpSession)
                        mockMvc.perform(
                                        post("/api/auth/login")
                                                .with(csrf())
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        """
                                                        {"username":"test-owner","password":"test-password"}
                                                        """))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getRequest()
                                .getSession(false);

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("test-owner"))
                .andExpect(jsonPath("$.platformRoles[0]").value("PLATFORM_OWNER"))
                .andExpect(jsonPath("$.workspaces[0].role").value("OWNER"))
                .andExpect(jsonPath("$.workspaces[0].name").value("Test Workspace"));

        assertThat(auditEventRepository.findAll())
                .anyMatch(event -> "LOGIN_SUCCESS".equals(event.getEventType()));

        assertThat(session.getMaxInactiveInterval()).isEqualTo(30 * 60);
    }

    @Test
    void successfulLoginRotatesPreAuthenticationSessionId() throws Exception {
        MockHttpSession preAuthenticationSession = new MockHttpSession();
        String preAuthenticationSessionId = preAuthenticationSession.getId();

        MockHttpSession authenticatedSession =
                (MockHttpSession)
                        mockMvc.perform(
                                        post("/api/auth/login")
                                                .session(preAuthenticationSession)
                                                .with(csrf())
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        """
                                                        {"username":"test-owner","password":"test-password"}
                                                        """))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getRequest()
                                .getSession(false);

        assertThat(authenticatedSession).isNotNull();
        assertThat(authenticatedSession.getId()).isNotEqualTo(preAuthenticationSessionId);
    }

    @Test
    void staleDeletedAccountSessionIsRejectedInsteadOfCreatingWorkspace() throws Exception {
        AppUserPrincipal stalePrincipal =
                new AppUserPrincipal(
                        Long.MAX_VALUE,
                        "deleted-user",
                        "deleted-password-hash",
                        true,
                        false,
                        Set.of(),
                        Set.of());

        mockMvc.perform(get("/api/auth/me").with(user(stalePrincipal)))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(
                        post("/api/workspaces/onboarding")
                                .with(user(stalePrincipal))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"삭제된 계정의 Workspace\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("로그인 세션이 유효하지 않습니다. 다시 로그인해 주세요."));
    }

    @Test
    void platformOwnerCanReauthenticateAndLogoutAllSessions() throws Exception {
        MockHttpSession session = login();
        session.setAttribute("SELF_INTRO_REAUTHENTICATED_AT", 0L);

        mockMvc.perform(
                        post("/api/auth/reauthenticate")
                                .session(session)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"password\":\"test-password\"}"))
                .andExpect(status().isNoContent());

        assertThat((Long) session.getAttribute("SELF_INTRO_REAUTHENTICATED_AT")).isGreaterThan(0L);

        mockMvc.perform(post("/api/auth/sessions/logout-all").session(session).with(csrf()))
                .andExpect(status().isNoContent());

        assertThatThrownBy(() -> session.getAttribute("SELF_INTRO_REAUTHENTICATED_AT"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void reauthenticationRejectsWrongPassword() throws Exception {
        MockHttpSession session = login();

        mockMvc.perform(
                        post("/api/auth/reauthenticate")
                                .session(session)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized());

        assertThat(auditEventRepository.findAll())
                .anyMatch(
                        event ->
                                "REAUTHENTICATION_FAILURE".equals(event.getEventType())
                                        && "PRIMARY_CREDENTIALS_REJECTED"
                                                .equals(event.getReasonCode()));
    }

    @Test
    void changedDeviceContextIsHashedAndAuditedWithoutBlockingRequest() throws Exception {
        MockHttpSession session = login();

        mockMvc.perform(
                        get("/api/auth/me")
                                .session(session)
                                .header("User-Agent", "different-device"))
                .andExpect(status().isOk());

        assertThat(auditEventRepository.findAll())
                .anyMatch(
                        event ->
                                "LOGIN_CONTEXT_ANOMALY".equals(event.getEventType())
                                        && "DEVICE_CHANGED".equals(event.getReasonCode())
                                        && event.getIpHash() != null
                                        && !event.getIpHash().isBlank());
    }

    @Test
    void unknownApiIsDeniedByDefault() throws Exception {
        mockMvc.perform(get("/api/not-explicitly-public")).andExpect(status().isUnauthorized());
    }

    @Test
    void activeWorkspaceIsNotPublicUntilPublicationModelAllowsIt() throws Exception {
        Workspace privateWorkspace =
                workspaceRepository.save(Workspace.createPrivatePersonal("Private Workspace"));

        mockMvc.perform(get("/api/bff/workspaces/" + privateWorkspace.getSlug() + "/introduction"))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicIntroductionUsesOnlyWorkspaceSkillPresentationAndCompetency() {
        Workspace first =
                workspaceRepository.save(
                        Workspace.createPersonal("First isolated workspace", "isolation-first"));
        Workspace second =
                workspaceRepository.save(
                        Workspace.createPersonal("Second isolated workspace", "isolation-second"));
        Skill sharedCatalogSkill =
                skillRepository.save(
                        Skill.create(
                                "Shared catalog skill for isolation", "BACKEND", null, false, 0));
        workspaceSkillRepository.save(
                WorkspaceSkill.create(
                        first.getId(),
                        sharedCatalogSkill,
                        "ADVANCED",
                        "1",
                        "first-only",
                        "WORK_EXPERIENCE",
                        true,
                        0));
        workspaceSkillRepository.save(
                WorkspaceSkill.create(
                        second.getId(),
                        sharedCatalogSkill,
                        "LEARNING",
                        "2",
                        "second-only",
                        "LEARNING",
                        false,
                        0));
        competencyRepository.save(
                Competency.create(first.getId(), "First competency", "first evidence", 0, true));
        competencyRepository.save(
                Competency.create(second.getId(), "Second competency", "second evidence", 0, true));

        workspacePublicationService.publishSystem(first.getId());
        workspacePublicationService.publishSystem(second.getId());

        var firstIntroduction = bffService.getIntroduction(first.getId(), IntroductionChannel.WEB);
        var secondIntroduction =
                bffService.getIntroduction(second.getId(), IntroductionChannel.WEB);

        assertThat(firstIntroduction.skills())
                .extracting(item -> item.comment())
                .containsExactly("first-only");
        assertThat(secondIntroduction.skills())
                .extracting(item -> item.comment())
                .containsExactly("second-only");
        assertThat(firstIntroduction.competencies())
                .extracting(item -> item.title())
                .containsExactly("First competency");
        assertThat(secondIntroduction.competencies())
                .extracting(item -> item.title())
                .containsExactly("Second competency");
    }

    @Test
    void publicIntroductionChangesOnlyAfterRepublishAndUnpublishClosesPublicRoute()
            throws Exception {
        AppUser owner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "publication-owner",
                                "unused-password-hash",
                                "Publication Owner",
                                "publication-owner@example.com"));
        Workspace workspace =
                workspaceRepository.save(Workspace.createPrivatePersonal("Publication workspace"));
        workspaceMemberRepository.save(WorkspaceMember.owner(workspace, owner));
        profileService.upsert(workspace.getId(), profileRequest("첫 발행 소개"));

        workspacePublicationService.publish(workspace.getId(), owner.getId());

        mockMvc.perform(
                        get(
                                "/api/bff/workspaces/"
                                        + workspace.getSlug()
                                        + "/introduction?channel=WEB"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.bio").value("첫 발행 소개"));

        profileService.upsert(workspace.getId(), profileRequest("저장했지만 미발행인 소개"));

        mockMvc.perform(
                        get(
                                "/api/bff/workspaces/"
                                        + workspace.getSlug()
                                        + "/introduction?channel=WEB"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.bio").value("첫 발행 소개"));

        workspacePublicationService.publish(workspace.getId(), owner.getId());

        mockMvc.perform(
                        get(
                                "/api/bff/workspaces/"
                                        + workspace.getSlug()
                                        + "/introduction?channel=WEB"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.bio").value("저장했지만 미발행인 소개"));

        mockMvc.perform(
                        get("/api/workspaces/"
                                        + workspace.getSlug()
                                        + "/publication/manage/revisions")
                                .with(user(AppUserPrincipal.of(owner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revisions[0].revisionNumber").value(2))
                .andExpect(jsonPath("$.revisions[1].revisionNumber").value(1))
                .andExpect(jsonPath("$.revisions[1].rollbackAvailable").value(true))
                .andExpect(jsonPath("$.maximumRetainedRevisions").value(20))
                .andExpect(jsonPath("$.minimumRetentionDays").value(180));

        mockMvc.perform(
                        post("/api/workspaces/"
                                        + workspace.getSlug()
                                        + "/publication/manage/revisions/1/rollback")
                                .with(user(AppUserPrincipal.of(owner, Set.of())))
                                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revisionNumber").value(3))
                .andExpect(jsonPath("$.publicationStatus").value("PUBLISHED"));

        mockMvc.perform(
                        get(
                                "/api/bff/workspaces/"
                                        + workspace.getSlug()
                                        + "/introduction?channel=WEB"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.bio").value("첫 발행 소개"));

        var revisions =
                workspacePublicationRevisionRepository
                        .findAllByWorkspaceIdOrderByRevisionNumberDesc(workspace.getId());
        assertThat(revisions).hasSize(3);
        assertThat(revisions.getFirst().getRevisionNumber()).isEqualTo(3);
        assertThat(revisions.getFirst().getOperationType())
                .isEqualTo(PublicationOperationType.ROLLBACK);
        assertThat(revisions.getFirst().getSourceRevisionNumber()).isEqualTo(1);

        workspacePublicationService.unpublish(workspace.getId());

        mockMvc.perform(
                        get(
                                "/api/bff/workspaces/"
                                        + workspace.getSlug()
                                        + "/introduction?channel=WEB"))
                .andExpect(status().isNotFound());
    }

    @Test
    void workspaceSlugChangeRequiresReauthenticationAndPreservesCanonicalAliasBoundary()
            throws Exception {
        AppUser owner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "slug-owner",
                                "unused-password-hash",
                                "Slug Owner",
                                "slug-owner@example.com"));
        Workspace workspace =
                workspaceRepository.save(
                        Workspace.createPersonal("Slug workspace", "slug-source-workspace"));
        workspaceSlugService.registerCanonical(workspace);
        workspaceMemberRepository.save(WorkspaceMember.owner(workspace, owner));
        profileService.upsert(workspace.getId(), profileRequest("slug alias 공개 소개"));
        workspacePublicationService.publish(workspace.getId(), owner.getId());
        AppUserPrincipal principal = AppUserPrincipal.of(owner, Set.of());
        MockHttpSession session = new MockHttpSession();

        mockMvc.perform(
                        put("/api/workspaces/slug-source-workspace/settings/slug")
                                .session(session)
                                .with(user(principal))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"slug\":\"slug-canonical-workspace\"}"))
                .andExpect(status().isUnauthorized());

        session.setAttribute("SELF_INTRO_REAUTHENTICATED_AT", System.currentTimeMillis());
        mockMvc.perform(
                        put("/api/workspaces/slug-source-workspace/settings/slug")
                                .session(session)
                                .with(user(principal))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"slug\":\"slug-canonical-workspace\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canonicalSlug").value("slug-canonical-workspace"))
                .andExpect(jsonPath("$.activeAliases[0]").value("slug-source-workspace"));

        mockMvc.perform(get("/api/public/workspaces/slug-source-workspace/resolution"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requestedSlug").value("slug-source-workspace"))
                .andExpect(jsonPath("$.canonicalSlug").value("slug-canonical-workspace"));
        mockMvc.perform(get("/api/bff/workspaces/slug-source-workspace/introduction"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.bio").value("slug alias 공개 소개"));
        mockMvc.perform(
                        get("/api/workspaces/slug-source-workspace/slug-resolution")
                                .with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canonicalSlug").value("slug-canonical-workspace"));

        Workspace conflicting =
                workspaceRepository.save(
                        Workspace.createPrivatePersonal("Conflicting slug workspace"));
        workspaceSlugService.registerCanonical(conflicting);
        MockHttpSession recentSession = new MockHttpSession();
        recentSession.setAttribute("SELF_INTRO_REAUTHENTICATED_AT", System.currentTimeMillis());
        mockMvc.perform(
                        put("/api/workspaces/slug-source-workspace/settings/slug")
                                .session(recentSession)
                                .with(user(principal))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"slug\":\"" + conflicting.getSlug() + "\"}"))
                .andExpect(status().isConflict());

        assertThat(workspaceRepository.findById(workspace.getId()).orElseThrow().getSlug())
                .isEqualTo("slug-canonical-workspace");
        assertThat(
                        workspaceSlugAliasRepository.findBySlugAndRetiredAtIsNull(
                                "slug-source-workspace"))
                .isPresent();
        assertThat(auditEventRepository.findAll())
                .anyMatch(event -> "WORKSPACE_SLUG_CHANGED".equals(event.getEventType()));
    }

    @Test
    void publicWorkspaceResolutionHidesPrivateMissingAndRevisionlessStates() throws Exception {
        Workspace privateWorkspace =
                workspaceRepository.save(Workspace.createPrivatePersonal("Private workspace"));
        workspaceSlugService.registerCanonical(privateWorkspace);
        Workspace revisionlessWorkspace =
                workspaceRepository.save(
                        Workspace.createPersonal(
                                "Revisionless workspace", "revisionless-workspace"));
        workspaceSlugService.registerCanonical(revisionlessWorkspace);

        for (String slug :
                List.of(
                        privateWorkspace.getSlug(),
                        revisionlessWorkspace.getSlug(),
                        "workspace-that-does-not-exist")) {
            mockMvc.perform(get("/api/public/workspaces/" + slug + "/resolution"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.message").value("공개 Workspace를 찾을 수 없습니다."));
        }
    }

    @Test
    void protectedWorkspaceResolutionHidesExistingWorkspaceFromNonMember() throws Exception {
        AppUser owner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "routing-owner",
                                "unused-password-hash",
                                "Routing Owner",
                                "routing-owner@example.com"));
        AppUser outsider =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "routing-outsider",
                                "unused-password-hash",
                                "Routing Outsider",
                                "routing-outsider@example.com"));
        Workspace workspace =
                workspaceRepository.save(
                        Workspace.createPrivatePersonal("Hidden routing workspace"));
        workspaceSlugService.registerCanonical(workspace);
        workspaceMemberRepository.save(WorkspaceMember.owner(workspace, owner));
        AppUserPrincipal outsiderPrincipal = AppUserPrincipal.of(outsider, Set.of());

        for (String slug : List.of(workspace.getSlug(), "workspace-that-does-not-exist")) {
            mockMvc.perform(
                            get("/api/workspaces/" + slug + "/slug-resolution")
                                    .with(user(outsiderPrincipal)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.message").value("리소스를 찾을 수 없습니다."));
        }
    }

    @Test
    void legacyWorkspaceResolverFailsClosedWhenUserHasMultipleMemberships() {
        AppUser user =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "multi-workspace-user",
                                "unused-password-hash",
                                "Multi Workspace User",
                                "multi-workspace@example.com"));
        Workspace first = workspaceRepository.save(Workspace.createPrivatePersonal("First"));
        Workspace second = workspaceRepository.save(Workspace.createPrivatePersonal("Second"));
        workspaceSlugService.registerCanonical(first);
        workspaceSlugService.registerCanonical(second);
        workspaceMemberRepository.save(WorkspaceMember.owner(first, user));
        workspaceMemberRepository.save(WorkspaceMember.owner(second, user));
        AppUserPrincipal principal = AppUserPrincipal.of(user, Set.of());
        var authentication =
                UsernamePasswordAuthenticationToken.authenticated(
                        principal, principal.getPassword(), principal.getAuthorities());

        assertThatThrownBy(() -> currentWorkspaceService.requireDefaultMembership(authentication))
                .isInstanceOfSatisfying(
                        ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode().value()).isEqualTo(409));
    }

    @Test
    void ambiguousDefaultWorkspaceProfileAndExperienceManagementRoutesAreRemoved() {
        var mappings = requestMappingHandlerMapping.getHandlerMethods().keySet();

        assertThat(mappings)
                .noneMatch(mapping -> mapping.getPatternValues().contains("/api/profile"))
                .noneMatch(
                        mapping -> mapping.getPatternValues().contains("/api/admin/experiences"));
        assertThat(mappings)
                .filteredOn(mapping -> mapping.getPatternValues().contains("/api/experiences"))
                .allMatch(
                        mapping ->
                                mapping.getMethodsCondition()
                                        .getMethods()
                                        .equals(Set.of(RequestMethod.GET)));
        assertThat(mappings)
                .noneMatch(mapping -> mapping.getPatternValues().contains("/api/bff/introduction"));
    }

    @Test
    void workspaceOwnedStudyCompetencyAndPortfolioAdminCompatibilityRoutesAreRemoved() {
        var mappings = requestMappingHandlerMapping.getHandlerMethods().keySet();

        assertThat(mappings)
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues().stream()
                                        .anyMatch(
                                                pattern ->
                                                        pattern.startsWith(
                                                                "/api/admin/experiences/ai")))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues().stream()
                                        .anyMatch(
                                                pattern ->
                                                        pattern.startsWith(
                                                                "/api/admin/experience-tree")))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues().stream()
                                        .anyMatch(
                                                pattern ->
                                                        pattern.startsWith(
                                                                "/api/admin/print-templates")))
                .noneMatch(mapping -> mapping.getPatternValues().contains("/api/admin/studies"))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues()
                                        .contains("/api/admin/studies/ai/suggestions"))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues()
                                        .contains("/api/admin/studies/ai/suggestions/stream"))
                .noneMatch(
                        mapping -> mapping.getPatternValues().contains("/api/admin/competencies"))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues()
                                        .contains("/api/admin/competencies/ai/suggestions"))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues()
                                        .contains("/api/admin/competencies/ai/suggestions/stream"))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues()
                                        .contains("/api/admin/portfolio/case-studies"))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues()
                                        .contains(
                                                "/api/admin/portfolio/case-studies/{caseStudyId}/revisions/generate"))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues()
                                        .contains("/api/admin/study-taxonomy-curation"))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues().stream()
                                        .anyMatch(
                                                pattern ->
                                                        pattern.startsWith(
                                                                "/api/admin/experience-placements")));
    }

    @Test
    void normalWorkspaceUserCannotTriggerManualVectorSynchronization() throws Exception {
        AppUser user =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "vector-sync-user",
                                "unused-password-hash",
                                "Vector Sync User",
                                "vector-sync-user@example.com"));
        AppUserPrincipal principal = AppUserPrincipal.of(user, Set.of());

        mockMvc.perform(post("/api/v1/vector-sync/backfill-all").with(user(principal)).with(csrf()))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/vector-sync/reconciliation").with(user(principal)))
                .andExpect(status().isForbidden());
    }

    @Test
    void normalWorkspaceUserCannotOperateSharedJobPostingCatalog() throws Exception {
        AppUser user =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "job-catalog-user",
                                "unused-password-hash",
                                "Job Catalog User",
                                "job-catalog-user@example.com"));
        AppUserPrincipal principal = AppUserPrincipal.of(user, Set.of());

        mockMvc.perform(get("/api/admin/job-postings").with(user(principal)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/worker/job-postings/collect").with(user(principal)).with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    void arbitraryWorkspaceExperienceAndStudyVectorInjectionRoutesAreRemoved() {
        var mappings = requestMappingHandlerMapping.getHandlerMethods().keySet();

        assertThat(mappings)
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues()
                                        .contains("/api/v1/vector-sync/experience"))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues().contains("/api/v1/vector-sync/study"));
    }

    @Test
    void defaultWorkspaceJobApplicationAiRoutesAreRemoved() {
        var mappings = requestMappingHandlerMapping.getHandlerMethods().keySet();
        var removedSuffixes =
                List.of(
                        "/analyze-appeal",
                        "/generate-cover-letter-draft",
                        "/print-template-draft/stream",
                        "/gap-project-documents",
                        "/rematch");

        assertThat(mappings)
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues().stream()
                                        .anyMatch(
                                                pattern ->
                                                        pattern.startsWith(
                                                                        "/api/worker/job-postings/")
                                                                && (pattern.contains(
                                                                                "/print-template-draft")
                                                                        || removedSuffixes.stream()
                                                                                .anyMatch(
                                                                                        pattern
                                                                                                ::endsWith))));
    }

    @Test
    void defaultWorkspaceJobApplicationArtifactsRoutesAreRemoved() {
        var mappings = requestMappingHandlerMapping.getHandlerMethods().keySet();

        assertThat(mappings)
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues().stream()
                                        .anyMatch(
                                                pattern ->
                                                        pattern.startsWith(
                                                                        "/api/admin/job-postings/")
                                                                && (pattern.contains(
                                                                                "/cover-letter-items")
                                                                        || pattern.endsWith(
                                                                                "/direct-pdf"))))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues().stream()
                                        .anyMatch(
                                                pattern ->
                                                        pattern.startsWith(
                                                                        "/api/admin/print-templates/")
                                                                && (pattern.endsWith("/mark-final")
                                                                        || pattern.endsWith(
                                                                                "/unmark-final")
                                                                        || pattern.endsWith(
                                                                                "/final-pdf"))));
    }

    @Test
    void personalJobApplicationMutationsAreNotExposedByPlatformCatalogRoutes() {
        var mappings = requestMappingHandlerMapping.getHandlerMethods().keySet();

        assertThat(mappings)
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues().contains("/api/admin/job-postings")
                                        && mapping.getMethodsCondition()
                                                .getMethods()
                                                .contains(RequestMethod.POST))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues().contains("/api/admin/job-postings/{id}")
                                        && mapping.getMethodsCondition().getMethods().stream()
                                                .anyMatch(
                                                        method ->
                                                                method == RequestMethod.PUT
                                                                        || method
                                                                                == RequestMethod
                                                                                        .DELETE))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues().stream()
                                        .anyMatch(
                                                pattern ->
                                                        pattern.startsWith(
                                                                        "/api/admin/job-postings/{id}/")
                                                                && (pattern.endsWith("/memo")
                                                                        || pattern.endsWith("/save")
                                                                        || pattern.endsWith(
                                                                                "/unsave")
                                                                        || pattern.endsWith(
                                                                                "/dismiss")
                                                                        || pattern.endsWith(
                                                                                "/undismiss")
                                                                        || pattern.endsWith(
                                                                                "/apply")
                                                                        || pattern.endsWith(
                                                                                "/unapply")
                                                                        || pattern.endsWith(
                                                                                "/status")
                                                                        || pattern.contains(
                                                                                "/status-events")
                                                                        || pattern.endsWith(
                                                                                "/position-choices")
                                                                        || pattern.endsWith(
                                                                                "/jobplanet"))))
                .noneMatch(
                        mapping ->
                                mapping.getPatternValues()
                                        .contains("/api/admin/job-postings/settings"));

        assertThat(mappings)
                .anyMatch(
                        mapping ->
                                mapping.getPatternValues().contains("/api/admin/job-postings")
                                        && mapping.getMethodsCondition()
                                                .getMethods()
                                                .contains(RequestMethod.GET))
                .anyMatch(
                        mapping ->
                                mapping.getPatternValues()
                                                .contains(
                                                        "/api/admin/job-postings/{id}/permission-review")
                                        && mapping.getMethodsCondition()
                                                .getMethods()
                                                .contains(RequestMethod.PUT));
    }

    @Test
    void workspaceMembershipInvitationAndOwnershipTransferRespectRoleBoundaries() throws Exception {
        AppUser owner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "membership-owner",
                                "unused-password-hash",
                                "Membership Owner",
                                "membership-owner@example.com"));
        AppUser recipient =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "membership-recipient",
                                "unused-password-hash",
                                "Membership Recipient",
                                "membership-recipient@example.com"));
        AppUser wrongRecipient =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "membership-wrong",
                                "unused-password-hash",
                                "Wrong Recipient",
                                "membership-wrong@example.com"));
        Workspace workspace =
                workspaceRepository.save(Workspace.createPrivatePersonal("Membership workspace"));
        WorkspaceMember ownerMembership =
                workspaceMemberRepository.save(WorkspaceMember.owner(workspace, owner));
        MockHttpSession recentSession = new MockHttpSession();
        recentSession.setAttribute("SELF_INTRO_REAUTHENTICATED_AT", System.currentTimeMillis());
        AppUserPrincipal ownerPrincipal = AppUserPrincipal.of(owner, Set.of());

        mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                                        "/api/workspaces/"
                                                + workspace.getSlug()
                                                + "/members/manage/"
                                                + ownerMembership.getId())
                                .session(recentSession)
                                .with(user(ownerPrincipal))
                                .with(csrf()))
                .andExpect(status().isBadRequest());

        mockMvc.perform(
                        post("/api/workspaces/"
                                        + workspace.getSlug()
                                        + "/members/manage/invitations")
                                .session(recentSession)
                                .with(user(ownerPrincipal))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "email":"membership-recipient@example.com",
                                          "role":"EDITOR",
                                          "validForHours":24
                                        }
                                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recipientEmailMasked").value("m***@example.com"))
                .andExpect(jsonPath("$.role").value("EDITOR"))
                .andExpect(jsonPath("$.status").value("PENDING"));

        String invitationUrl = workspaceInvitationEmailSender.lastUrl.get();
        String rawToken = invitationUrl.substring(invitationUrl.indexOf("#invite=") + 8);
        assertThat(rawToken).startsWith("wsi_");
        assertThat(workspaceInvitationEmailSender.lastEmail.get())
                .isEqualTo("membership-recipient@example.com");

        mockMvc.perform(
                        post("/api/workspace-membership-invitations/accept")
                                .with(user(AppUserPrincipal.of(wrongRecipient, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"token\":\"" + rawToken + "\"}"))
                .andExpect(status().isNotFound());

        String accepted =
                mockMvc.perform(
                                post("/api/workspace-membership-invitations/accept")
                                        .with(user(AppUserPrincipal.of(recipient, Set.of())))
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{\"token\":\"" + rawToken + "\"}"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.member.role").value("EDITOR"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        long recipientMemberId = objectMapper.readTree(accepted).path("member").path("id").asLong();

        mockMvc.perform(
                        post("/api/workspace-membership-invitations/accept")
                                .with(user(AppUserPrincipal.of(recipient, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"token\":\"" + rawToken + "\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        put("/api/workspaces/"
                                        + workspace.getSlug()
                                        + "/members/manage/"
                                        + recipientMemberId
                                        + "/role")
                                .with(user(ownerPrincipal))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(
                        put("/api/workspaces/"
                                        + workspace.getSlug()
                                        + "/members/manage/"
                                        + recipientMemberId
                                        + "/role")
                                .session(recentSession)
                                .with(user(ownerPrincipal))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));

        mockMvc.perform(
                        post("/api/workspaces/"
                                        + workspace.getSlug()
                                        + "/members/manage/"
                                        + recipientMemberId
                                        + "/transfer-ownership")
                                .session(recentSession)
                                .with(user(ownerPrincipal))
                                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previousOwner.role").value("ADMIN"))
                .andExpect(jsonPath("$.newOwner.role").value("OWNER"));

        assertThat(
                        workspaceMemberRepository.countByWorkspaceIdAndStatusAndRole(
                                workspace.getId(),
                                com.selfintro.modules.identity.domain.MembershipStatus.ACTIVE,
                                WorkspaceRole.OWNER))
                .isEqualTo(1);

        MockHttpSession newOwnerSession = new MockHttpSession();
        newOwnerSession.setAttribute("SELF_INTRO_REAUTHENTICATED_AT", System.currentTimeMillis());
        mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                                        "/api/workspaces/"
                                                + workspace.getSlug()
                                                + "/members/manage/"
                                                + ownerMembership.getId())
                                .session(newOwnerSession)
                                .with(user(AppUserPrincipal.of(recipient, Set.of())))
                                .with(csrf()))
                .andExpect(status().isNoContent());

        mockMvc.perform(
                        post("/api/workspaces/"
                                        + workspace.getSlug()
                                        + "/members/manage/invitations")
                                .session(newOwnerSession)
                                .with(user(AppUserPrincipal.of(recipient, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "email":"membership-wrong@example.com",
                                          "role":"VIEWER",
                                          "validForHours":24
                                        }
                                        """))
                .andExpect(status().isCreated());
        String declineUrl = workspaceInvitationEmailSender.lastUrl.get();
        String declineToken = declineUrl.substring(declineUrl.indexOf("#invite=") + 8);
        mockMvc.perform(
                        post("/api/workspace-membership-invitations/decline")
                                .with(user(AppUserPrincipal.of(wrongRecipient, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"token\":\"" + declineToken + "\"}"))
                .andExpect(status().isNoContent());

        assertThat(
                        workspaceMemberRepository
                                .findById(ownerMembership.getId())
                                .orElseThrow()
                                .getStatus())
                .isEqualTo(com.selfintro.modules.identity.domain.MembershipStatus.SUSPENDED);
        assertThat(
                        workspaceMembershipInvitationRepository
                                .findAllByWorkspaceIdOrderByCreatedAtDesc(workspace.getId()))
                .hasSize(2)
                .anyMatch(
                        invitation ->
                                invitation.getStatus()
                                        == com.selfintro.modules.identity.domain
                                                .WorkspaceMembershipInvitationStatus.DECLINED);
        assertThat(auditEventRepository.findAll())
                .anyMatch(event -> "WORKSPACE_OWNERSHIP_TRANSFERRED".equals(event.getEventType()));
        assertThat(auditEventRepository.findAll())
                .anyMatch(
                        event ->
                                "WORKSPACE_MEMBER_INVITATION_DECLINED"
                                        .equals(event.getEventType()));
    }

    @Test
    void databaseRejectsSecondActiveWorkspaceOwner() {
        AppUser firstOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "broken-owner-first",
                                "unused-password-hash",
                                "Broken Owner First",
                                "broken-owner-first@example.com"));
        AppUser duplicateOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "broken-owner-second",
                                "unused-password-hash",
                                "Broken Owner Second",
                                "broken-owner-second@example.com"));
        Workspace workspace =
                workspaceRepository.save(Workspace.createPrivatePersonal("Broken owner workspace"));
        workspaceMemberRepository.saveAndFlush(WorkspaceMember.owner(workspace, firstOwner));

        assertThatThrownBy(
                        () ->
                                workspaceMemberRepository.saveAndFlush(
                                        WorkspaceMember.owner(workspace, duplicateOwner)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void membershipInvitationCannotBeAcceptedAfterWorkspaceClosure() {
        AppUser owner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "closed-invite-owner",
                                "unused-password-hash",
                                "Closed Invite Owner",
                                "closed-invite-owner@example.com"));
        AppUser recipient =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "closed-invite-recipient",
                                "unused-password-hash",
                                "Closed Invite Recipient",
                                "closed-invite-recipient@example.com"));
        Workspace workspace =
                workspaceRepository.save(
                        Workspace.createPrivatePersonal("Closed invite workspace"));
        workspaceMemberRepository.save(WorkspaceMember.owner(workspace, owner));
        String rawToken = "closed-workspace-membership-token";
        workspaceMembershipInvitationRepository.save(
                WorkspaceMembershipInvitation.issue(
                        workspace.getId(),
                        owner.getId(),
                        recipient.getEmailCanonical(),
                        WorkspaceRole.VIEWER,
                        registrationSecretHasher.hash(rawToken),
                        LocalDateTime.now().plusDays(1)));
        LocalDateTime now = LocalDateTime.now();
        workspace.close(owner.getId(), now, now.plusDays(30));
        workspaceRepository.saveAndFlush(workspace);

        assertThatThrownBy(() -> workspaceMembershipService.accept(recipient.getId(), rawToken))
                .isInstanceOfSatisfying(
                        ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode().value()).isEqualTo(404));
    }

    @Test
    void invitationRetentionDeletesOnlyRowsPastTerminalRetention() {
        LocalDateTime now = LocalDateTime.now();
        AppUser inviter =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "retention-inviter",
                                "unused-password-hash",
                                "Retention Inviter",
                                "retention-inviter@example.com"));
        Workspace workspace =
                workspaceRepository.save(Workspace.createPrivatePersonal("Retention workspace"));
        RegistrationInvitation registration =
                invitationRepository.save(
                        RegistrationInvitation.issue(
                                registrationSecretHasher.hash("retention-registration"),
                                now.plusDays(1),
                                1,
                                inviter.getId()));
        WorkspaceMembershipInvitation membership =
                workspaceMembershipInvitationRepository.save(
                        WorkspaceMembershipInvitation.issue(
                                workspace.getId(),
                                inviter.getId(),
                                "retention-recipient@example.com",
                                WorkspaceRole.VIEWER,
                                registrationSecretHasher.hash("retention-membership"),
                                now.plusDays(1)));
        EmailVerificationToken verificationToken =
                emailVerificationTokenRepository.save(
                        EmailVerificationToken.issue(
                                inviter.getId(),
                                registrationSecretHasher.hash("retention-email-verification"),
                                now.plusDays(1),
                                now.minusDays(31)));
        verificationToken.use(now.minusDays(31));
        emailVerificationTokenRepository.save(verificationToken);

        jdbcTemplate.update(
                "update registration_invitation set status = 'USED', used_at = ? where id = ?",
                now.minusDays(31),
                registration.getId());
        jdbcTemplate.update(
                "update workspace_membership_invitation set status = 'DECLINED', declined_at = ? where id = ?",
                now.minusDays(31),
                membership.getId());

        InvitationRetentionService.CleanupResult result = invitationRetentionService.cleanup(now);

        assertThat(result.registrationDeleted()).isGreaterThanOrEqualTo(1);
        assertThat(result.emailVerificationDeleted()).isGreaterThanOrEqualTo(1);
        assertThat(result.workspaceDeleted()).isGreaterThanOrEqualTo(1);
        assertThat(emailVerificationTokenRepository.findById(verificationToken.getId())).isEmpty();
        assertThat(
                        jdbcTemplate.queryForObject(
                                "select count(*) from registration_invitation where id = ?",
                                Integer.class,
                                registration.getId()))
                .isZero();
        assertThat(
                        jdbcTemplate.queryForObject(
                                "select count(*) from workspace_membership_invitation where id = ?",
                                Integer.class,
                                membership.getId()))
                .isZero();
    }

    @Test
    void workspaceLifecycleRenameLeaveAndCloseRespectOwnershipBoundaries() throws Exception {
        AppUser owner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "lifecycle-owner",
                                "unused-password-hash",
                                "Lifecycle Owner",
                                "lifecycle-owner@example.com"));
        AppUser admin =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "lifecycle-admin",
                                "unused-password-hash",
                                "Lifecycle Admin",
                                "lifecycle-admin@example.com"));
        Workspace workspace =
                workspaceRepository.save(Workspace.createPrivatePersonal("Lifecycle Workspace"));
        WorkspaceMember ownerMember =
                workspaceMemberRepository.save(WorkspaceMember.owner(workspace, owner));
        WorkspaceMember adminMember =
                workspaceMemberRepository.save(
                        WorkspaceMember.active(workspace, admin, WorkspaceRole.ADMIN));
        workspaceMembershipInvitationRepository.save(
                WorkspaceMembershipInvitation.issue(
                        workspace.getId(),
                        owner.getId(),
                        "lifecycle-pending@example.com",
                        WorkspaceRole.VIEWER,
                        registrationSecretHasher.hash("lifecycle-pending-token"),
                        LocalDateTime.now().plusDays(1)));

        MockHttpSession ownerSession = new MockHttpSession();
        ownerSession.setAttribute("SELF_INTRO_REAUTHENTICATED_AT", System.currentTimeMillis());
        MockHttpSession adminSession = new MockHttpSession();
        adminSession.setAttribute("SELF_INTRO_REAUTHENTICATED_AT", System.currentTimeMillis());
        AppUserPrincipal ownerPrincipal = AppUserPrincipal.of(owner, Set.of());
        AppUserPrincipal adminPrincipal = AppUserPrincipal.of(admin, Set.of());

        mockMvc.perform(
                        put("/api/workspaces/" + workspace.getSlug() + "/settings/name")
                                .session(ownerSession)
                                .with(user(ownerPrincipal))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Renamed Lifecycle Workspace\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed Lifecycle Workspace"));

        mockMvc.perform(
                        post("/api/workspaces/" + workspace.getSlug() + "/members/leave")
                                .session(ownerSession)
                                .with(user(ownerPrincipal))
                                .with(csrf()))
                .andExpect(status().isConflict());

        mockMvc.perform(
                        post("/api/workspaces/" + workspace.getSlug() + "/members/leave")
                                .session(adminSession)
                                .with(user(adminPrincipal))
                                .with(csrf()))
                .andExpect(status().isNoContent());
        assertThat(
                        workspaceMemberRepository
                                .findById(adminMember.getId())
                                .orElseThrow()
                                .getStatus())
                .isEqualTo(com.selfintro.modules.identity.domain.MembershipStatus.SUSPENDED);

        mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                                        "/api/workspaces/" + workspace.getSlug() + "/lifecycle")
                                .session(ownerSession)
                                .with(user(ownerPrincipal))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"workspaceName\":\"wrong name\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                                        "/api/workspaces/" + workspace.getSlug() + "/lifecycle")
                                .session(ownerSession)
                                .with(user(ownerPrincipal))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"workspaceName\":\"Renamed Lifecycle Workspace\"}"))
                .andExpect(status().isNoContent());

        Workspace closed = workspaceRepository.findById(workspace.getId()).orElseThrow();
        assertThat(closed.getStatus()).isEqualTo(WorkspaceStatus.DELETED);
        assertThat(closed.getPublicationStatus())
                .isEqualTo(
                        com.selfintro.modules.identity.domain.WorkspacePublicationStatus.PRIVATE);
        assertThat(closed.getDeletedAt()).isNotNull();
        assertThat(closed.getPurgeAfter()).isAfter(closed.getDeletedAt());
        var purgeJob =
                workspacePurgeJobRepository.findByWorkspaceId(workspace.getId()).orElseThrow();
        assertThat(purgeJob.getStatus().name()).isEqualTo("PENDING_GRACE");
        assertThat(
                        workspacePurgeCheckpointRepository.findAllByPurgeJobIdOrderByStoreTypeAsc(
                                purgeJob.getId()))
                .hasSize(5)
                .allMatch(checkpoint -> checkpoint.getStatus().name().equals("PENDING"));

        workspacePurgeService.schedule(closed, owner.getId(), LocalDateTime.now());
        assertThat(workspacePurgeJobRepository.findAll())
                .filteredOn(job -> job.getWorkspaceId().equals(workspace.getId()))
                .hasSize(1);
        assertThat(
                        workspacePurgeCheckpointRepository.findAllByPurgeJobIdOrderByStoreTypeAsc(
                                purgeJob.getId()))
                .hasSize(5);
        assertThat(
                        workspaceMemberRepository
                                .findById(ownerMember.getId())
                                .orElseThrow()
                                .getStatus())
                .isEqualTo(com.selfintro.modules.identity.domain.MembershipStatus.SUSPENDED);
        assertThat(
                        workspaceMembershipInvitationRepository
                                .findAllByWorkspaceIdOrderByCreatedAtDesc(workspace.getId())
                                .getFirst()
                                .getStatus())
                .isEqualTo(
                        com.selfintro.modules.identity.domain.WorkspaceMembershipInvitationStatus
                                .REVOKED);

        mockMvc.perform(
                        get("/api/workspaces/" + workspace.getSlug() + "/members/manage")
                                .with(user(ownerPrincipal)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/workspaces/" + workspace.getSlug() + "/resolution"))
                .andExpect(status().isNotFound());
        mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                                        "/api/workspaces/" + workspace.getSlug() + "/lifecycle")
                                .session(ownerSession)
                                .with(user(ownerPrincipal))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"workspaceName\":\"Renamed Lifecycle Workspace\"}"))
                .andExpect(status().isNotFound());
        assertThatThrownBy(
                        () ->
                                workspaceLifecycleService.rename(
                                        ownerMember, "Closed Workspace Cannot Be Renamed"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(
                        exception ->
                                assertThat(((ResponseStatusException) exception).getStatusCode())
                                        .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND));
        mockMvc.perform(get("/api/auth/me").with(user(ownerPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workspaces.length()").value(0));
        assertThat(auditEventRepository.findAll())
                .anyMatch(event -> "WORKSPACE_RENAMED".equals(event.getEventType()))
                .anyMatch(event -> "WORKSPACE_MEMBER_LEFT".equals(event.getEventType()))
                .anyMatch(event -> "WORKSPACE_CLOSED".equals(event.getEventType()));
    }

    @Test
    void workspaceMutationRollsBackWhenItsSuccessAuditCannotBePersisted() throws Exception {
        AppUser owner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "audit-atomic-owner",
                                "unused-password-hash",
                                "Audit Atomic Owner",
                                "audit-atomic-owner@example.com"));
        Workspace workspace =
                workspaceRepository.save(Workspace.createPrivatePersonal("Audit Atomic Workspace"));
        workspaceMemberRepository.save(WorkspaceMember.owner(workspace, owner));

        doThrow(new IllegalStateException("simulated audit storage failure"))
                .when(securityAuditService)
                .recordWorkspaceAction("WORKSPACE_RENAMED", owner.getId(), workspace.getId());

        MockHttpSession session = new MockHttpSession();
        session.setAttribute("SELF_INTRO_REAUTHENTICATED_AT", System.currentTimeMillis());
        try {
            mockMvc.perform(
                            put("/api/workspaces/" + workspace.getSlug() + "/settings/name")
                                    .session(session)
                                    .with(user(AppUserPrincipal.of(owner, Set.of())))
                                    .with(csrf())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"name\":\"Must Roll Back\"}"))
                    .andExpect(status().isInternalServerError());
        } finally {
            reset(securityAuditService);
        }

        assertThat(workspaceRepository.findById(workspace.getId()).orElseThrow().getName())
                .isEqualTo("Audit Atomic Workspace");
    }

    private ProfileRequest profileRequest(String bio) {
        return new ProfileRequest(
                "발행 테스트",
                "Publication Test",
                "Backend Engineer",
                bio,
                "Java/Spring",
                "테스트 중",
                "https://github.com/example",
                "private@example.com",
                "010-0000-0000",
                false,
                false);
    }

    @Test
    void workspaceSkillApiDoesNotExposeOverlayToAnotherWorkspace() throws Exception {
        AppUser firstOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "skill-owner-first",
                                "unused-password-hash",
                                "Skill Owner First",
                                "skill-owner-first@example.com"));
        AppUser secondOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "skill-owner-second",
                                "unused-password-hash",
                                "Skill Owner Second",
                                "skill-owner-second@example.com"));
        Workspace first = workspaceRepository.save(Workspace.createPrivatePersonal("First skills"));
        Workspace second =
                workspaceRepository.save(Workspace.createPrivatePersonal("Second skills"));
        workspaceMemberRepository.save(WorkspaceMember.owner(first, firstOwner));
        workspaceMemberRepository.save(WorkspaceMember.owner(second, secondOwner));
        skillRepository.save(
                Skill.create("Workspace API catalog skill", "BACKEND", null, false, 0));

        String payload =
                """
                {
                  "name":"Workspace API catalog skill",
                  "category":"BACKEND",
                  "skillLevel":"ADVANCED",
                  "skillVersion":"21",
                  "comment":"first workspace only",
                  "usageType":"WORK_EXPERIENCE",
                  "badgeKey":"",
                  "badgeColor":"",
                  "isCore":true,
                  "displayOrder":0
                }
                """;

        mockMvc.perform(
                        post("/api/workspaces/" + first.getSlug() + "/skills")
                                .with(user(AppUserPrincipal.of(firstOwner, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comment").value("first workspace only"));

        mockMvc.perform(
                        get("/api/workspaces/" + first.getSlug() + "/skills")
                                .with(user(AppUserPrincipal.of(firstOwner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Workspace API catalog skill"))
                .andExpect(jsonPath("$[0].comment").value("first workspace only"));

        mockMvc.perform(
                        get("/api/workspaces/" + second.getSlug() + "/skills")
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(
                        get("/api/workspaces/" + first.getSlug() + "/skills")
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of()))))
                .andExpect(status().isNotFound());
    }

    @Test
    void workspaceAiEndpointsDoNotAcceptAnotherWorkspaceMembership() throws Exception {
        AppUser firstOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "ai-owner-first",
                                "unused-password-hash",
                                "AI Owner First",
                                "ai-owner-first@example.com"));
        AppUser secondOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "ai-owner-second",
                                "unused-password-hash",
                                "AI Owner Second",
                                "ai-owner-second@example.com"));
        Workspace first = workspaceRepository.save(Workspace.createPrivatePersonal("First AI"));
        Workspace second = workspaceRepository.save(Workspace.createPrivatePersonal("Second AI"));
        workspaceMemberRepository.save(WorkspaceMember.owner(first, firstOwner));
        workspaceMemberRepository.save(WorkspaceMember.owner(second, secondOwner));
        var secondPrincipal = user(AppUserPrincipal.of(secondOwner, Set.of()));

        mockMvc.perform(
                        post("/api/workspaces/" + first.getSlug() + "/competencies/ai/suggestions")
                                .with(secondPrincipal)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"instruction":"","draftTitle":"","draftSummary":"","skillIds":[],"experienceIds":[],"studyIds":[]}
                                        """))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        post("/api/workspaces/"
                                        + first.getSlug()
                                        + "/experiences/manage/ai/suggestions")
                                .with(secondPrincipal)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"instruction":"","type":"PROJECT","draftTitle":"","skillIds":[],"studyIds":[],"relatedExperienceIds":[]}
                                        """))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        post("/api/workspaces/"
                                        + first.getSlug()
                                        + "/studies/manage/ai/suggestions")
                                .with(secondPrincipal)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"instruction":"","draftTitle":"","draftSummary":"","skillIds":[],"experienceIds":[],"experienceDetailIds":[],"relatedStudyIds":[]}
                                        """))
                .andExpect(status().isNotFound());
    }

    @Test
    void workspaceLearningResourceKeepsPersonalStateAndTagsInsideWorkspace() throws Exception {
        AppUser firstOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "learning-owner-first",
                                "unused-password-hash",
                                "Learning Owner First",
                                "learning-owner-first@example.com"));
        AppUser secondOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "learning-owner-second",
                                "unused-password-hash",
                                "Learning Owner Second",
                                "learning-owner-second@example.com"));
        Workspace first =
                workspaceRepository.save(Workspace.createPrivatePersonal("First learning"));
        Workspace second =
                workspaceRepository.save(Workspace.createPrivatePersonal("Second learning"));
        workspaceMemberRepository.save(WorkspaceMember.owner(first, firstOwner));
        workspaceMemberRepository.save(WorkspaceMember.owner(second, secondOwner));
        LearningResource catalog =
                learningResourceRepository.save(
                        LearningResource.create(
                                "shared-learning-catalog",
                                "Shared Learning Catalog",
                                LearningResourceType.BOOK,
                                "Shared Provider",
                                "https://example.com/shared-learning",
                                "Shared Author",
                                120,
                                LearningResourceStatus.WISHLIST,
                                null,
                                0,
                                null,
                                null));

        mockMvc.perform(
                        post("/api/workspaces/"
                                        + first.getSlug()
                                        + "/learning-resources/manage/"
                                        + catalog.getId())
                                .with(user(AppUserPrincipal.of(firstOwner, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        workspaceLearningPayload(
                                                "IN_PROGRESS",
                                                "P0",
                                                "first note",
                                                "first-learning-tag")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary").value("first note"));

        mockMvc.perform(
                        post("/api/workspaces/"
                                        + second.getSlug()
                                        + "/learning-resources/manage/"
                                        + catalog.getId())
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        workspaceLearningPayload(
                                                "WISHLIST",
                                                "P3",
                                                "second note",
                                                "second-learning-tag")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary").value("second note"));

        mockMvc.perform(
                        get("/api/workspaces/" + first.getSlug() + "/learning-resources/manage")
                                .with(user(AppUserPrincipal.of(firstOwner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.content[0].summary").value("first note"))
                .andExpect(jsonPath("$.content[0].tags[0].name").value("first-learning-tag"));

        mockMvc.perform(
                        get("/api/workspaces/" + second.getSlug() + "/learning-resources/manage")
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].status").value("WISHLIST"))
                .andExpect(jsonPath("$.content[0].summary").value("second note"))
                .andExpect(jsonPath("$.content[0].tags[0].name").value("second-learning-tag"));

        mockMvc.perform(
                        get("/api/workspaces/"
                                        + first.getSlug()
                                        + "/learning-resources/manage/"
                                        + catalog.getId())
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of()))))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        get("/api/workspaces/"
                                        + second.getSlug()
                                        + "/learning-resources/manage/catalog")
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + catalog.getId() + ")].saved").value(true));
    }

    @Test
    void workspaceJobApplicationKeepsStatusMemoAndHistoryInsideWorkspace() throws Exception {
        AppUser firstOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "job-owner-first",
                                "unused-password-hash",
                                "Job Owner First",
                                "job-owner-first@example.com"));
        AppUser secondOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "job-owner-second",
                                "unused-password-hash",
                                "Job Owner Second",
                                "job-owner-second@example.com"));
        Workspace first = workspaceRepository.save(Workspace.createPrivatePersonal("First jobs"));
        Workspace second = workspaceRepository.save(Workspace.createPrivatePersonal("Second jobs"));
        workspaceMemberRepository.save(WorkspaceMember.owner(first, firstOwner));
        workspaceMemberRepository.save(WorkspaceMember.owner(second, secondOwner));
        LocalDateTime permissionReviewedAt = LocalDateTime.now();
        JobPosting posting =
                JobPosting.registerApplied(
                        "Shared Company",
                        "Backend Engineer",
                        "https://example.com/jobs/workspace-isolation",
                        "직접입력",
                        java.time.LocalDate.of(2026, 8, 10),
                        java.time.LocalDate.of(2026, 8, 31),
                        false,
                        null,
                        "Seoul",
                        "FULL_TIME",
                        null,
                        "Shared description",
                        "Java",
                        "Spring",
                        "Interview",
                        "Online",
                        null,
                        permissionReviewedAt);
        posting.reviewSharingPermission(
                JobPostingPermissionReviewStatus.APPROVED,
                JobPostingPermissionBasis.EMPLOYER_DIRECT_SUBMISSION,
                "test-fixture:workspace-isolation",
                "Shared Company",
                "채용 담당 부서",
                "테스트 Workspace의 저장·상태 관리 재노출 허용",
                "test-v1",
                "jobs@example.com",
                permissionReviewedAt.plusDays(30),
                firstOwner.getId(),
                permissionReviewedAt);
        posting = jobPostingRepository.save(posting);

        mockMvc.perform(
                        post("/api/workspaces/"
                                        + first.getSlug()
                                        + "/job-applications/manage/"
                                        + posting.getId())
                                .with(user(AppUserPrincipal.of(firstOwner, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(workspaceJobPayload("SAVED", null, "first memo", 5)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SAVED"))
                .andExpect(jsonPath("$.memo").value("first memo"));

        mockMvc.perform(
                        post("/api/workspaces/"
                                        + second.getSlug()
                                        + "/job-applications/manage/"
                                        + posting.getId())
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        workspaceJobPayload(
                                                "APPLIED", "2026-08-10", "second memo", 2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPLIED"))
                .andExpect(jsonPath("$.memo").value("second memo"));

        mockMvc.perform(
                        get("/api/workspaces/" + first.getSlug() + "/job-applications/manage")
                                .with(user(AppUserPrincipal.of(firstOwner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("SAVED"))
                .andExpect(jsonPath("$[0].memo").value("first memo"));

        mockMvc.perform(
                        get("/api/workspaces/" + second.getSlug() + "/job-applications/manage")
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("APPLIED"))
                .andExpect(jsonPath("$[0].memo").value("second memo"));

        mockMvc.perform(
                        get("/api/workspaces/"
                                        + first.getSlug()
                                        + "/job-applications/manage/"
                                        + posting.getId())
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of()))))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                                        "/api/workspaces/"
                                                + second.getSlug()
                                                + "/job-applications/manage/"
                                                + posting.getId()
                                                + "/status")
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"status":"INTERVIEW_1","appliedAt":"2026-08-10","memo":"면접 전환"}
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INTERVIEW_1"));

        mockMvc.perform(
                        get("/api/workspaces/"
                                        + second.getSlug()
                                        + "/job-applications/manage/"
                                        + posting.getId()
                                        + "/status-events")
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[1].status").value("INTERVIEW_1"));
    }

    @Test
    void workspacePrivateJobImportRoutesKeepAllSourcesInsideOwningWorkspace() throws Exception {
        AppUser firstOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "private-job-owner-first",
                                "unused-password-hash",
                                "Private Job Owner First",
                                "private-job-owner-first@example.com"));
        AppUser secondOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "private-job-owner-second",
                                "unused-password-hash",
                                "Private Job Owner Second",
                                "private-job-owner-second@example.com"));
        Workspace first =
                workspaceRepository.save(Workspace.createPrivatePersonal("First private jobs"));
        Workspace second =
                workspaceRepository.save(Workspace.createPrivatePersonal("Second private jobs"));
        workspaceMemberRepository.save(WorkspaceMember.owner(first, firstOwner));
        workspaceMemberRepository.save(WorkspaceMember.owner(second, secondOwner));

        long manualId = createWorkspacePrivateJob(first, firstOwner, "수동 입력 회사", "MANUAL", null);
        long urlId =
                createWorkspacePrivateJob(
                        first,
                        firstOwner,
                        "URL 입력 회사",
                        "URL_INGEST",
                        "https://example.com/private/url-route");
        long screenshotId =
                createWorkspacePrivateJob(
                        first,
                        firstOwner,
                        "스크린샷 입력 회사",
                        "IMAGE_INGEST",
                        "https://example.com/private/screenshot-route");

        mockMvc.perform(
                        get("/api/workspaces/" + first.getSlug() + "/job-applications/manage")
                                .with(user(AppUserPrincipal.of(firstOwner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(
                        jsonPath("$[?(@.id == " + manualId + ")].collectionMethod").value("MANUAL"))
                .andExpect(
                        jsonPath("$[?(@.id == " + urlId + ")].collectionMethod")
                                .value("URL_INGEST"))
                .andExpect(
                        jsonPath("$[?(@.id == " + screenshotId + ")].collectionMethod")
                                .value("IMAGE_INGEST"));

        mockMvc.perform(
                        get("/api/workspaces/" + second.getSlug() + "/job-applications/manage")
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(
                        get("/api/workspaces/"
                                        + second.getSlug()
                                        + "/job-applications/manage/"
                                        + screenshotId)
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of()))))
                .andExpect(status().isNotFound());
    }

    @Test
    void workspaceStudyMutationKeepsSlugTagsAndIdsInsideWorkspace() throws Exception {
        AppUser firstOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "study-owner-first",
                                "unused-password-hash",
                                "Study Owner First",
                                "study-owner-first@example.com"));
        AppUser secondOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "study-owner-second",
                                "unused-password-hash",
                                "Study Owner Second",
                                "study-owner-second@example.com"));
        Workspace first = workspaceRepository.save(Workspace.createPrivatePersonal("First study"));
        Workspace second =
                workspaceRepository.save(Workspace.createPrivatePersonal("Second study"));
        workspaceMemberRepository.save(WorkspaceMember.owner(first, firstOwner));
        workspaceMemberRepository.save(WorkspaceMember.owner(second, secondOwner));

        String firstPayload = studyPayload("same-slug", "First private study", "first-private-tag");
        String secondPayload =
                studyPayload("same-slug", "Second private study", "second-private-tag");

        JsonNode firstCreated =
                objectMapper.readTree(
                        mockMvc.perform(
                                        post("/api/workspaces/"
                                                        + first.getSlug()
                                                        + "/studies/manage")
                                                .with(
                                                        user(
                                                                AppUserPrincipal.of(
                                                                        firstOwner, Set.of())))
                                                .with(csrf())
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(firstPayload))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.slug").value("same-slug"))
                                .andReturn()
                                .getResponse()
                                .getContentAsString());

        mockMvc.perform(
                        post("/api/workspaces/" + second.getSlug() + "/studies/manage")
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(secondPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("same-slug"));

        mockMvc.perform(
                        put("/api/workspaces/"
                                        + second.getSlug()
                                        + "/studies/manage/"
                                        + firstCreated.get("id").asLong())
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(secondPayload))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        get("/api/workspaces/" + first.getSlug() + "/studies/manage")
                                .with(user(AppUserPrincipal.of(firstOwner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].tags[0].name").value("first-private-tag"));

        mockMvc.perform(
                        get("/api/workspaces/" + second.getSlug() + "/studies/manage")
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].tags[0].name").value("second-private-tag"));
    }

    @Test
    void workspacePortfolioKeepsProjectsSlugsAndIdsInsideWorkspace() throws Exception {
        AppUser firstOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "portfolio-owner-first",
                                "unused-password-hash",
                                "Portfolio Owner First",
                                "portfolio-owner-first@example.com"));
        AppUser secondOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "portfolio-owner-second",
                                "unused-password-hash",
                                "Portfolio Owner Second",
                                "portfolio-owner-second@example.com"));
        Workspace first =
                workspaceRepository.save(Workspace.createPrivatePersonal("First portfolio"));
        Workspace second =
                workspaceRepository.save(Workspace.createPrivatePersonal("Second portfolio"));
        workspaceMemberRepository.save(WorkspaceMember.owner(first, firstOwner));
        workspaceMemberRepository.save(WorkspaceMember.owner(second, secondOwner));

        long firstProjectId =
                createWorkspaceProject(first, firstOwner, "First project", "first-project");
        long secondProjectId =
                createWorkspaceProject(second, secondOwner, "Second project", "second-project");

        JsonNode firstCaseStudy =
                createWorkspaceCaseStudy(first, firstOwner, firstProjectId, "same-case-study");
        createWorkspaceCaseStudy(second, secondOwner, secondProjectId, "same-case-study");

        mockMvc.perform(
                        get("/api/workspaces/"
                                        + second.getSlug()
                                        + "/portfolio/case-studies/manage/"
                                        + firstCaseStudy.path("id").asLong())
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of()))))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        post("/api/workspaces/"
                                        + first.getSlug()
                                        + "/portfolio/case-studies/manage")
                                .with(user(AppUserPrincipal.of(firstOwner, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"experienceId":%d,"slug":"cross-project","title":"Cross project"}
                                        """
                                                .formatted(secondProjectId)))
                .andExpect(status().isBadRequest());

        long firstTemplateId = createWorkspacePrintTemplate(first, firstOwner, "First template");
        createWorkspacePrintTemplate(second, secondOwner, "Second template");

        mockMvc.perform(
                        put("/api/workspaces/"
                                        + second.getSlug()
                                        + "/print-templates/manage/"
                                        + firstTemplateId)
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of())))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(printTemplatePayload("Cross update")))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        get("/api/workspaces/" + second.getSlug() + "/print-templates/manage")
                                .with(user(AppUserPrincipal.of(secondOwner, Set.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Second template"));
    }

    private long createWorkspaceProject(
            Workspace workspace, AppUser owner, String title, String slug) throws Exception {
        String response =
                mockMvc.perform(
                                post("/api/workspaces/"
                                                + workspace.getSlug()
                                                + "/experiences/manage")
                                        .with(user(AppUserPrincipal.of(owner, Set.of())))
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "type":"PROJECT",
                                                  "title":"%s",
                                                  "periodStart":"2026-08-10",
                                                  "summary":"workspace project",
                                                  "takeaway":"",
                                                  "displayOrder":0,
                                                  "details":[],
                                                  "skillIds":[],
                                                  "tagNames":[],
                                                  "images":[],
                                                  "showOnTimeline":true,
                                                  "timelineLabel":"",
                                                  "slug":"%s",
                                                  "role":"Developer",
                                                  "contributionRate":100,
                                                  "repositoryUrl":""
                                                }
                                                """
                                                        .formatted(title, slug)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return objectMapper.readTree(response).path("id").asLong();
    }

    private JsonNode createWorkspaceCaseStudy(
            Workspace workspace, AppUser owner, long projectId, String slug) throws Exception {
        String response =
                mockMvc.perform(
                                post("/api/workspaces/"
                                                + workspace.getSlug()
                                                + "/portfolio/case-studies/manage")
                                        .with(user(AppUserPrincipal.of(owner, Set.of())))
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"experienceId":%d,"slug":"%s","title":"Workspace case study"}
                                                """
                                                        .formatted(projectId, slug)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.slug").value(slug))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return objectMapper.readTree(response);
    }

    private long createWorkspacePrintTemplate(Workspace workspace, AppUser owner, String name)
            throws Exception {
        String response =
                mockMvc.perform(
                                post("/api/workspaces/"
                                                + workspace.getSlug()
                                                + "/print-templates/manage")
                                        .with(user(AppUserPrincipal.of(owner, Set.of())))
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(printTemplatePayload(name)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return objectMapper.readTree(response).path("id").asLong();
    }

    private String printTemplatePayload(String name) {
        return """
                {
                  "name":"%s",
                  "excludedIds":"[]",
                  "sectionOrder":"[]",
                  "sectionGaps":"{}",
                  "targetRole":"GENERAL",
                  "contentOverrides":"{}",
                  "schemaVersion":2,
                  "visible":true,
                  "displayOrder":0,
                  "jobPostingId":null,
                  "lineHeight":1.625
                }
                """
                .formatted(name);
    }

    private String studyPayload(String slug, String title, String tag) {
        return """
                {
                  "slug":"%s",
                  "title":"%s",
                  "summary":"workspace isolated summary",
                  "contentMarkdown":"workspace isolated content",
                  "status":"DRAFT",
                  "section":"ETC",
                  "taxonomyNodeIds":[],
                  "tagNames":["%s"],
                  "skillIds":[],
                  "experienceIds":[],
                  "experienceDetailIds":[],
                  "relatedStudies":[],
                  "images":[],
                  "learnedAt":"2026-08-10",
                  "publishedAt":null
                }
                """
                .formatted(slug, title, tag);
    }

    private String workspaceLearningPayload(
            String status, String priorityTier, String summary, String tag) {
        return """
                {
                  "status":"%s",
                  "priorityTier":"%s",
                  "displayOrder":0,
                  "summary":"%s",
                  "detailMarkdown":"workspace private note",
                  "tagNames":["%s"]
                }
                """
                .formatted(status, priorityTier, summary, tag);
    }

    private String workspaceJobPayload(
            String status, String appliedAt, String memo, int interestLevel) {
        String appliedAtJson = appliedAt == null ? "null" : "\"" + appliedAt + "\"";
        return """
                {
                  "status":"%s",
                  "appliedAt":%s,
                  "memo":"%s",
                  "interestLevel":%d,
                  "matchScore":80,
                  "matchReason":"workspace private analysis"
                }
                """
                .formatted(status, appliedAtJson, memo, interestLevel);
    }

    private long createWorkspacePrivateJob(
            Workspace workspace,
            AppUser owner,
            String companyName,
            String source,
            String postingUrl)
            throws Exception {
        String postingUrlJson = postingUrl == null ? "null" : "\"" + postingUrl + "\"";
        String response =
                mockMvc.perform(
                                post("/api/workspaces/"
                                                + workspace.getSlug()
                                                + "/job-applications/manage/private-sources")
                                        .with(user(AppUserPrincipal.of(owner, Set.of())))
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "companyName":"%s",
                                                  "positionTitle":"백엔드 개발자",
                                                  "source":"%s",
                                                  "postingUrl":%s,
                                                  "deadline":"2026-08-31",
                                                  "alwaysOpen":false,
                                                  "status":"SAVED",
                                                  "memo":"Workspace private import",
                                                  "interestLevel":3
                                                }
                                                """
                                                        .formatted(
                                                                companyName,
                                                                source,
                                                                postingUrlJson)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.ownerWorkspaceId").value(workspace.getId()))
                        .andExpect(jsonPath("$.collectionMethod").value(source))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return objectMapper.readTree(response).path("id").asLong();
    }

    @Test
    void workspaceOwnerManagesOnlyOwnPrivateProfileThroughSlugScopedApi() throws Exception {
        var profileOwner =
                appUserRepository.save(
                        AppUser.createBootstrapOwner(
                                "profile-owner",
                                "unused-password-hash",
                                "Profile Owner",
                                "profile-owner@example.com"));
        var profileWorkspace =
                workspaceRepository.save(Workspace.createPrivatePersonal("Profile Workspace"));
        workspaceMemberRepository.save(WorkspaceMember.owner(profileWorkspace, profileOwner));
        AppUserPrincipal profileOwnerPrincipal = AppUserPrincipal.of(profileOwner, Set.of());

        String profilePayload =
                """
                {
                  "name":"프로필 사용자",
                  "nameEn":"Profile User",
                  "jobTitle":"Backend Engineer",
                  "bio":"Workspace별 비공개 프로필",
                  "coreStackSummary":"Java / Spring",
                  "statusBadgeText":"비공개 작성 중",
                  "githubUrl":"https://github.com/example",
                  "email":"",
                  "phone":"",
                  "publicEmail":false,
                  "publicPhone":false
                }
                """;

        mockMvc.perform(
                        put("/api/workspaces/" + profileWorkspace.getSlug() + "/profile")
                                .with(user(profileOwnerPrincipal))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(profilePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("프로필 사용자"))
                .andExpect(jsonPath("$.email").value(""))
                .andExpect(jsonPath("$.publicEmail").value(false));

        mockMvc.perform(
                        get("/api/workspaces/" + profileWorkspace.getSlug() + "/profile")
                                .with(user(profileOwnerPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobTitle").value("Backend Engineer"));

        mockMvc.perform(get("/api/workspaces/" + profileWorkspace.getSlug() + "/profile"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(
                        get("/api/workspaces/" + profileWorkspace.getSlug() + "/profile")
                                .with(user(platformOwnerPrincipal())))
                .andExpect(status().isNotFound());
    }

    @Test
    void workspacePolicyHidesWorkspaceExistenceAndPersistsDeniedAudit() {
        var user = appUserRepository.findByLoginId("test-owner").orElseThrow();
        var membership = workspaceMemberRepository.findAll().stream().findFirst().orElseThrow();

        assertThatThrownBy(
                        () ->
                                workspaceAccessPolicy.requireAnyRole(
                                        user.getId() + 999,
                                        membership.getWorkspace().getId(),
                                        WorkspaceRole.VIEWER))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");

        assertThat(auditEventRepository.findAll())
                .anyMatch(
                        event ->
                                "AUTHORIZATION_DENIED".equals(event.getEventType())
                                        && "MEMBERSHIP_NOT_FOUND".equals(event.getReasonCode()));
    }

    @Test
    void invitedUserVerifiesEmailAndCreatesPrivateWorkspaceWithProvisionalSlug() throws Exception {
        String invitationCode = "invite-registration-test";
        invitationRepository.save(
                RegistrationInvitation.issue(
                        registrationSecretHasher.hash(invitationCode),
                        LocalDateTime.now().plusHours(1),
                        1,
                        null));

        mockMvc.perform(
                        post("/api/auth/registrations")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "invitationCode":"invite-registration-test",
                                          "email":"New.User@example.com",
                                          "password":"ValidPass1!",
                                          "nickname":"새 사용자",
                                          "termsAccepted":true,
                                          "privacyAccepted":true,
                                          "marketingAccepted":false
                                        }
                                        """))
                .andExpect(status().isAccepted());

        var pendingUser =
                appUserRepository.findByEmailCanonical("new.user@example.com").orElseThrow();
        assertThat(pendingUser.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);
        assertThat(pendingUser.getEmailVerifiedAt()).isNull();

        mockMvc.perform(
                        post("/api/auth/login")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"username":"new.user@example.com","password":"ValidPass1!"}
                                        """))
                .andExpect(status().isUnauthorized());

        String rawToken = emailVerificationSender.lastToken.get();
        assertThat(rawToken).isNotBlank();
        mockMvc.perform(
                        post("/api/auth/email-verifications")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"token\":\"" + rawToken + "\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(
                        post("/api/auth/email-verifications")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"token\":\"" + rawToken + "\"}"))
                .andExpect(status().isBadRequest());

        MockHttpSession userSession =
                (MockHttpSession)
                        mockMvc.perform(
                                        post("/api/auth/login")
                                                .with(csrf())
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        """
                                                        {"username":"new.user@example.com","password":"ValidPass1!"}
                                                        """))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getRequest()
                                .getSession(false);

        mockMvc.perform(
                        post("/api/workspaces/onboarding")
                                .session(userSession)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"새 사용자의 Workspace\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicKey").isNotEmpty())
                .andExpect(
                        jsonPath("$.slug")
                                .value(org.hamcrest.Matchers.matchesPattern("w-[0-9a-f]{20}")))
                .andExpect(jsonPath("$.name").value("새 사용자의 Workspace"))
                .andExpect(jsonPath("$.publicationStatus").value("PRIVATE"));

        var membership =
                workspaceMemberRepository
                        .findAllByUserIdAndStatus(
                                pendingUser.getId(),
                                com.selfintro.modules.identity.domain.MembershipStatus.ACTIVE)
                        .getFirst();
        assertThat(membership.getRole()).isEqualTo(WorkspaceRole.OWNER);
        assertThat(membership.getWorkspace().getSlug()).startsWith("w-");
        assertThat(membership.getWorkspace().getPublicKey()).isNotNull();

        mockMvc.perform(
                        get(
                                "/api/bff/workspaces/"
                                        + membership.getWorkspace().getSlug()
                                        + "/introduction"))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        post("/api/studies")
                                .session(userSession)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void invalidInvitationCannotRevealWhetherEmailAlreadyExists() throws Exception {
        appUserRepository.save(
                AppUser.createBootstrapOwner(
                        "enumeration-existing",
                        "unused-password-hash",
                        "Enumeration Existing",
                        "enumeration-existing@example.com"));

        String existingEmailPayload =
                """
                {
                  "invitationCode":"invalid-enumeration-code",
                  "email":"enumeration-existing@example.com",
                  "password":"ValidPass1!",
                  "nickname":"기존 사용자",
                  "termsAccepted":true,
                  "privacyAccepted":true,
                  "marketingAccepted":false
                }
                """;
        String newEmailPayload =
                existingEmailPayload.replace(
                        "enumeration-existing@example.com", "enumeration-new@example.com");

        mockMvc.perform(
                        post("/api/auth/registrations")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(existingEmailPayload))
                .andExpect(status().isBadRequest());
        mockMvc.perform(
                        post("/api/auth/registrations")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(newEmailPayload))
                .andExpect(status().isBadRequest());
    }

    @Test
    void platformOwnerIssuesEmailBoundInvitationAndWrongEmailCannotConsumeIt() throws Exception {
        MockHttpSession session = login();
        session.setAttribute("SELF_INTRO_REAUTHENTICATED_AT", 0L);

        mockMvc.perform(
                        post("/api/ops/invitations")
                                .session(session)
                                .with(user(platformOwnerPrincipal()))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label":"Private beta individual",
                                          "recipientEmail":"Ops.Invited@example.com",
                                          "maxUses":1,
                                          "validForHours":24,
                                          "sendEmail":true
                                        }
                                        """))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(
                        post("/api/auth/reauthenticate")
                                .session(session)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"password\":\"test-password\"}"))
                .andExpect(status().isNoContent());

        String response =
                mockMvc.perform(
                                post("/api/ops/invitations")
                                        .session(session)
                                        .with(user(platformOwnerPrincipal()))
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "label":"Private beta individual",
                                                  "recipientEmail":"Ops.Invited@example.com",
                                                  "maxUses":1,
                                                  "validForHours":24,
                                                  "sendEmail":true
                                                }
                                                """))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.code").doesNotExist())
                        .andExpect(jsonPath("$.invitationUrl").doesNotExist())
                        .andExpect(
                                jsonPath("$.invitation.recipientEmailMasked")
                                        .value("o***@example.com"))
                        .andExpect(jsonPath("$.invitation.sentCount").value(1))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();

        assertThat(invitationEmailSender.lastEmail.get()).isEqualTo("ops.invited@example.com");
        String invitationUrl = invitationEmailSender.lastUrl.get();
        assertThat(invitationUrl).contains("#invite=");
        String code = invitationUrl.substring(invitationUrl.indexOf("#invite=") + 8);

        mockMvc.perform(
                        post("/api/auth/registrations")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "invitationCode":"%s",
                                          "email":"wrong@example.com",
                                          "password":"ValidPass1!",
                                          "nickname":"잘못된 사용자",
                                          "termsAccepted":true,
                                          "privacyAccepted":true,
                                          "marketingAccepted":false
                                        }
                                        """
                                                .formatted(code)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(
                        post("/api/auth/registrations")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "invitationCode":"%s",
                                          "email":"ops.invited@example.com",
                                          "password":"ValidPass1!",
                                          "nickname":"초대 사용자",
                                          "termsAccepted":true,
                                          "privacyAccepted":true,
                                          "marketingAccepted":false
                                        }
                                        """
                                                .formatted(code)))
                .andExpect(status().isAccepted());

        assertThat(auditEventRepository.findAll())
                .anyMatch(event -> "INVITATION_ISSUED".equals(event.getEventType()));
    }

    @Test
    void revokedInvitationCannotBeUsed() throws Exception {
        MockHttpSession session = login();
        String response =
                mockMvc.perform(
                                post("/api/ops/invitations")
                                        .session(session)
                                        .with(user(platformOwnerPrincipal()))
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "label":"Revocation test",
                                                  "recipientEmail":"",
                                                  "maxUses":3,
                                                  "validForHours":24,
                                                  "sendEmail":false
                                                }
                                                """))
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        JsonNode issued = objectMapper.readTree(response);
        long invitationId = issued.path("invitation").path("id").asLong();
        String code = issued.path("code").asText();

        mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                                        "/api/ops/invitations/" + invitationId)
                                .session(session)
                                .with(user(platformOwnerPrincipal()))
                                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REVOKED"));

        mockMvc.perform(
                        post("/api/auth/registrations")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "invitationCode":"%s",
                                          "email":"revoked@example.com",
                                          "password":"ValidPass1!",
                                          "nickname":"폐기 사용자",
                                          "termsAccepted":true,
                                          "privacyAccepted":true,
                                          "marketingAccepted":false
                                        }
                                        """
                                                .formatted(code)))
                .andExpect(status().isBadRequest());
    }

    @TestConfiguration
    static class RegistrationTestConfig {
        @Bean
        @Primary
        CapturingEmailVerificationSender capturingEmailVerificationSender() {
            return new CapturingEmailVerificationSender();
        }

        @Bean
        @Primary
        CapturingInvitationEmailSender capturingInvitationEmailSender() {
            return new CapturingInvitationEmailSender();
        }

        @Bean
        @Primary
        CapturingWorkspaceMembershipInvitationEmailSender
                capturingWorkspaceMembershipInvitationEmailSender() {
            return new CapturingWorkspaceMembershipInvitationEmailSender();
        }
    }

    static class CapturingEmailVerificationSender implements EmailVerificationSender {
        private final AtomicReference<String> lastToken = new AtomicReference<>();

        @Override
        public void send(String email, String rawToken) {
            lastToken.set(rawToken);
        }
    }

    static class CapturingInvitationEmailSender implements InvitationEmailSender {
        private final AtomicReference<String> lastEmail = new AtomicReference<>();
        private final AtomicReference<String> lastUrl = new AtomicReference<>();

        @Override
        public void send(String email, String invitationUrl, LocalDateTime expiresAt) {
            lastEmail.set(email);
            lastUrl.set(invitationUrl);
        }
    }

    static class CapturingWorkspaceMembershipInvitationEmailSender
            implements WorkspaceMembershipInvitationEmailSender {
        private final AtomicReference<String> lastEmail = new AtomicReference<>();
        private final AtomicReference<String> lastUrl = new AtomicReference<>();

        @Override
        public void send(
                String email,
                String workspaceName,
                String inviterDisplayName,
                String invitationUrl,
                LocalDateTime expiresAt) {
            lastEmail.set(email);
            lastUrl.set(invitationUrl);
        }
    }

    private MockHttpSession login() throws Exception {
        return (MockHttpSession)
                mockMvc.perform(
                                post("/api/auth/login")
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"username":"test-owner","password":"test-password"}
                                                """))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getRequest()
                        .getSession(false);
    }

    private AppUserPrincipal platformOwnerPrincipal() {
        var owner = appUserRepository.findByLoginId("test-owner").orElseThrow();
        return new AppUserPrincipal(
                owner.getId(),
                owner.getLoginId(),
                owner.getPasswordHash(),
                true,
                true,
                Set.of("PLATFORM_OWNER"),
                Set.of(
                        new SimpleGrantedAuthority("ROLE_PLATFORM_OWNER"),
                        new SimpleGrantedAuthority("ROLE_ADMIN")));
    }
}
