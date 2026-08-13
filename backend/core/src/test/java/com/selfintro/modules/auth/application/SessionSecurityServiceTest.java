package com.selfintro.modules.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.test.util.ReflectionTestUtils;

class SessionSecurityServiceTest {

    @Test
    void refusesLoginWhenPrincipalIndexRepositoryIsMissing() {
        SessionSecurityService service = service(null, 5, 2);

        assertThatThrownBy(() -> service.prepareForLogin(principal(Set.of())))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Principal-indexed session repository");
    }

    @Test
    void refusesRevocationWhenPrincipalIndexRepositoryIsMissing() {
        SessionSecurityService service = service(null, 5, 2);

        assertThatThrownBy(() -> service.revokeAll("usr-1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Principal-indexed session repository");
    }

    @Test
    void regularAccountLoginRemovesOldestSessionBeforeSixthSession() {
        @SuppressWarnings("unchecked")
        FindByIndexNameSessionRepository<Session> repository =
                mock(FindByIndexNameSessionRepository.class);
        Map<String, Session> sessions = new LinkedHashMap<>();
        for (int index = 1; index <= 5; index++) {
            Session session = session("session-" + index, Instant.ofEpochSecond(index));
            sessions.put(session.getId(), session);
        }
        when(repository.findByPrincipalName("usr-1")).thenReturn(sessions);
        SessionSecurityService service = service(repository, 5, 2);

        service.prepareForLogin(principal(Set.of()));

        verify(repository).deleteById("session-1");
        verify(repository, never()).deleteById("session-2");
    }

    @Test
    void platformAccountUsesShorterConcurrentSessionLimit() {
        @SuppressWarnings("unchecked")
        FindByIndexNameSessionRepository<Session> repository =
                mock(FindByIndexNameSessionRepository.class);
        Session first = session("session-1", Instant.ofEpochSecond(1));
        Session second = session("session-2", Instant.ofEpochSecond(2));
        when(repository.findByPrincipalName("usr-1"))
                .thenReturn(Map.of("session-1", first, "session-2", second));
        SessionSecurityService service = service(repository, 5, 2);

        service.prepareForLogin(principal(Set.of("PLATFORM_OWNER")));

        verify(repository).deleteById("session-1");
        verify(repository, never()).deleteById("session-2");
    }

    @Test
    void revokeAllDeletesEveryIndexedSession() {
        @SuppressWarnings("unchecked")
        FindByIndexNameSessionRepository<Session> repository =
                mock(FindByIndexNameSessionRepository.class);
        Session first = session("session-1", Instant.ofEpochSecond(1));
        Session second = session("session-2", Instant.ofEpochSecond(2));
        when(repository.findByPrincipalName("usr-1"))
                .thenReturn(Map.of("session-1", first, "session-2", second));
        SessionSecurityService service = service(repository, 5, 2);

        assertThat(service.revokeAll("usr-1")).isEqualTo(2);
        verify(repository).deleteById("session-1");
        verify(repository).deleteById("session-2");
    }

    private SessionSecurityService service(
            FindByIndexNameSessionRepository<Session> repository,
            int defaultMaximum,
            int platformMaximum) {
        @SuppressWarnings("unchecked")
        ObjectProvider<FindByIndexNameSessionRepository<? extends Session>> provider =
                mock(ObjectProvider.class);
        doReturn(repository).when(provider).getIfAvailable();
        SessionSecurityService service = new SessionSecurityService(provider);
        ReflectionTestUtils.setField(service, "defaultMaxConcurrent", defaultMaximum);
        ReflectionTestUtils.setField(service, "platformMaxConcurrent", platformMaximum);
        ReflectionTestUtils.setField(service, "principalIndexRequired", true);
        return service;
    }

    private AppUserPrincipal principal(Set<String> platformRoles) {
        return new AppUserPrincipal(1L, "usr-1", "password", true, false, platformRoles, Set.of());
    }

    private Session session(String id, Instant lastAccessedAt) {
        Session session = mock(Session.class);
        when(session.getId()).thenReturn(id);
        when(session.getLastAccessedTime()).thenReturn(lastAccessedAt);
        return session;
    }
}
