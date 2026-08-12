package com.selfintro.modules.auth.application;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SessionSecurityService {

    private final ObjectProvider<FindByIndexNameSessionRepository<? extends Session>>
            sessionRepositoryProvider;

    @Value("${app.security.session.default-max-concurrent:5}")
    private int defaultMaxConcurrent;

    @Value("${app.security.session.platform-max-concurrent:2}")
    private int platformMaxConcurrent;

    public void prepareForLogin(AppUserPrincipal principal) {
        FindByIndexNameSessionRepository<? extends Session> repository =
                sessionRepositoryProvider.getIfAvailable();
        if (repository == null) {
            return;
        }

        int maximum =
                principal.platformRoles().isEmpty() ? defaultMaxConcurrent : platformMaxConcurrent;
        var sessions =
                repository.findByPrincipalName(principal.getUsername()).values().stream()
                        .sorted(java.util.Comparator.comparing(Session::getLastAccessedTime))
                        .toList();
        int deleteCount = Math.max(0, sessions.size() - maximum + 1);
        for (int index = 0; index < deleteCount; index++) {
            repository.deleteById(sessions.get(index).getId());
        }
    }

    public int logoutAll(String principalName, HttpServletRequest request) {
        int deleted = 0;
        FindByIndexNameSessionRepository<? extends Session> repository =
                sessionRepositoryProvider.getIfAvailable();
        if (repository != null) {
            Map<String, ? extends Session> sessions = repository.findByPrincipalName(principalName);
            for (String sessionId : sessions.keySet()) {
                repository.deleteById(sessionId);
                deleted++;
            }
        }

        var currentSession = request.getSession(false);
        if (currentSession != null) {
            currentSession.invalidate();
            if (deleted == 0) {
                deleted = 1;
            }
        }
        return deleted;
    }
}
