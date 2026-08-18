package com.selfintro.global.web;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerMapping;

@Component
@RequiredArgsConstructor
public class CurrentWorkspaceArgumentResolver implements HandlerMethodArgumentResolver {

    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentWorkspace.class)
                && (Long.class.equals(parameter.getParameterType())
                        || long.class.equals(parameter.getParameterType())
                        || WorkspaceMember.class.isAssignableFrom(parameter.getParameterType()));
    }

    @Override
    public Object resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory) {
        CurrentWorkspace annotation = parameter.getParameterAnnotation(CurrentWorkspace.class);
        if (annotation == null) {
            return null;
        }

        HttpServletRequest servletRequest = webRequest.getNativeRequest(HttpServletRequest.class);
        if (servletRequest == null) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "요청 컨텍스트를 찾을 수 없습니다.");
        }

        @SuppressWarnings("unchecked")
        Map<String, String> uriVariables =
                (Map<String, String>)
                        servletRequest.getAttribute(
                                HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);

        String slug = uriVariables != null ? uriVariables.get(annotation.slugParam()) : null;
        if (slug == null || slug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace 식별자가 필요합니다.");
        }

        Authentication authentication =
                webRequest.getUserPrincipal() instanceof Authentication auth
                        ? auth
                        : SecurityContextHolder.getContext().getAuthentication();

        WorkspaceAccessLevel level = annotation.value();
        WorkspaceMember member =
                workspaceAccessPolicy.requireAnyRole(
                        authentication, slug, level.first(), level.additional());

        if (WorkspaceMember.class.isAssignableFrom(parameter.getParameterType())) {
            return member;
        }
        return member.getWorkspace().getId();
    }
}
