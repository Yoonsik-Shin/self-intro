package com.selfintro.modules.identity.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "user_platform_role",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_user_platform_role_user_role",
                        columnNames = {"user_id", "platform_role"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserPlatformRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform_role", nullable = false, length = 30)
    private PlatformRole role;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static UserPlatformRole owner(AppUser user) {
        UserPlatformRole platformRole = new UserPlatformRole();
        platformRole.user = user;
        platformRole.role = PlatformRole.PLATFORM_OWNER;
        platformRole.createdAt = LocalDateTime.now();
        return platformRole;
    }
}
