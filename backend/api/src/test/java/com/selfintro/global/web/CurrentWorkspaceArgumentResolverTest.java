package com.selfintro.global.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.servlet.HandlerMapping;

class CurrentWorkspaceArgumentResolverTest {

    private WorkspaceAccessPolicy workspaceAccessPolicy;
    private CurrentWorkspaceArgumentResolver resolver;

    @BeforeEach
    void setUp() {
        workspaceAccessPolicy = mock(WorkspaceAccessPolicy.class);
        resolver = new CurrentWorkspaceArgumentResolver(workspaceAccessPolicy);
    }

    @Test
    void resolvesWorkspaceIdFromSlug() throws Exception {
        MethodParameter parameter = mock(MethodParameter.class);
        CurrentWorkspace annotation = mock(CurrentWorkspace.class);
        when(annotation.value()).thenReturn(WorkspaceAccessLevel.READ);
        when(annotation.slugParam()).thenReturn("workspaceSlug");
        when(parameter.getParameterAnnotation(CurrentWorkspace.class)).thenReturn(annotation);
        when(parameter.getParameterType()).thenReturn((Class) Long.class);

        NativeWebRequest webRequest = mock(NativeWebRequest.class);
        HttpServletRequest servletRequest = mock(HttpServletRequest.class);
        Authentication auth = mock(Authentication.class);
        when(webRequest.getNativeRequest(HttpServletRequest.class)).thenReturn(servletRequest);
        when(webRequest.getUserPrincipal()).thenReturn(auth);
        when(servletRequest.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE))
                .thenReturn(Map.of("workspaceSlug", "slug-123"));

        Workspace workspace = mock(Workspace.class);
        when(workspace.getId()).thenReturn(100L);
        WorkspaceMember member = mock(WorkspaceMember.class);
        when(member.getWorkspace()).thenReturn(workspace);

        when(workspaceAccessPolicy.requireAnyRole(
                        auth,
                        "slug-123",
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR,
                        WorkspaceRole.VIEWER))
                .thenReturn(member);

        Object result = resolver.resolveArgument(parameter, null, webRequest, null);

        assertThat(result).isEqualTo(100L);
    }
}
