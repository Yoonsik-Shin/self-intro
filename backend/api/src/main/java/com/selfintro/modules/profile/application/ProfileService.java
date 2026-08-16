package com.selfintro.modules.profile.application;

import com.selfintro.modules.profile.domain.entity.Profile;
import com.selfintro.modules.profile.domain.repository.ProfileRepository;
import com.selfintro.modules.profile.presentation.dto.ProfileRequest;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProfileService {

    private final ProfileRepository profileRepository;

    public Optional<Profile> getProfile() {
        return profileRepository.findFirstProfile();
    }

    public Optional<Profile> getProfile(Long workspaceId) {
        return profileRepository.findByWorkspaceId(workspaceId);
    }

    @Transactional
    @CacheEvict(value = "bff:introduction", allEntries = true)
    public Profile upsert(Long workspaceId, ProfileRequest request) {
        String email = request.email() == null ? "" : request.email().trim();
        String phone = request.phone() == null ? "" : request.phone().trim();
        Optional<Profile> existing = profileRepository.findByWorkspaceId(workspaceId);
        if (existing.isPresent()) {
            Profile profile = existing.get();
            profile.update(
                    request.name(),
                    request.nameEn(),
                    request.jobTitle(),
                    request.bio(),
                    request.coreStackSummary(),
                    request.statusBadgeText(),
                    request.githubUrl(),
                    email,
                    phone,
                    request.publicEmail(),
                    request.publicPhone());
            return profileRepository.save(profile);
        } else {
            Profile profile =
                    Profile.create(
                            workspaceId,
                            request.name(),
                            request.nameEn(),
                            request.jobTitle(),
                            request.bio(),
                            request.coreStackSummary(),
                            request.statusBadgeText(),
                            request.githubUrl(),
                            email,
                            phone,
                            request.publicEmail(),
                            request.publicPhone());
            return profileRepository.save(profile);
        }
    }
}
