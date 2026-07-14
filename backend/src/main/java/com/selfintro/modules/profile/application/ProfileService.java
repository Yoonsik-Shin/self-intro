package com.selfintro.modules.profile.application;

import com.selfintro.modules.profile.domain.Profile;
import com.selfintro.modules.profile.domain.ProfileRepository;
import com.selfintro.modules.profile.presentation.dto.ProfileRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProfileService {

    private final ProfileRepository profileRepository;

    public Optional<Profile> getProfile() {
        return profileRepository.findFirstProfile();
    }

    @Transactional
    public Profile upsert(ProfileRequest request) {
        Optional<Profile> existing = profileRepository.findFirstProfile();
        if (existing.isPresent()) {
            Profile profile = existing.get();
            profile.update(
                request.name(),
                request.nameEn(),
                request.jobTitle(),
                request.bio(),
                request.careerSummary(),
                request.coreStackSummary(),
                request.statusBadgeText(),
                request.githubUrl(),
                request.email(),
                request.phone()
            );
            return profileRepository.save(profile);
        } else {
            Profile profile = Profile.create(
                request.name(),
                request.nameEn(),
                request.jobTitle(),
                request.bio(),
                request.careerSummary(),
                request.coreStackSummary(),
                request.statusBadgeText(),
                request.githubUrl(),
                request.email(),
                request.phone()
            );
            return profileRepository.save(profile);
        }
    }
}
