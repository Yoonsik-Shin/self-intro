package com.selfintro.modules.experience.application;

import com.selfintro.modules.experience.domain.*;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.modules.experience.presentation.dto.ExperienceRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExperienceService {

    private final ExperienceRepository experienceRepository;
    private final SkillRepository skillRepository;

    public List<Experience> getAllExperiences() {
        return experienceRepository.findAllByOrderByDisplayOrderAsc();
    }

    @Transactional
    public Experience create(ExperienceRequest request) {
        List<Skill> skills = request.skillIds() != null
            ? skillRepository.findAllById(request.skillIds())
            : List.of();

        List<ExperienceDetail> details = request.details() != null
            ? IntStream.range(0, request.details().size())
                .mapToObj(i -> ExperienceDetail.create(request.details().get(i), i))
                .collect(Collectors.toList())
            : List.of();

        Experience exp;
        switch (request.type().toUpperCase()) {
            case "CAREER" -> exp = Career.create(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.companyName(), request.employmentType(), request.department(), request.role()
            );
            case "PROJECT" -> exp = Project.create(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.slug(), request.role(), request.contributionRate()
            );
            case "EDUCATION" -> exp = Education.create(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.institutionName()
            );
            case "CERTIFICATE" -> exp = Certificate.create(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.issuer()
            );
            default -> throw new IllegalArgumentException("지원하지 않는 이력서 서브타입입니다: " + request.type());
        }

        return experienceRepository.save(exp);
    }

    @Transactional
    public Experience update(Long id, ExperienceRequest request) {
        Experience exp = experienceRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이력서 항목입니다."));

        List<Skill> skills = request.skillIds() != null
            ? skillRepository.findAllById(request.skillIds())
            : List.of();

        List<ExperienceDetail> details = request.details() != null
            ? IntStream.range(0, request.details().size())
                .mapToObj(i -> ExperienceDetail.create(request.details().get(i), i))
                .collect(Collectors.toList())
            : List.of();

        if (exp instanceof Career career && "CAREER".equalsIgnoreCase(request.type())) {
            career.update(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.companyName(), request.employmentType(), request.department(), request.role()
            );
        } else if (exp instanceof Project project && "PROJECT".equalsIgnoreCase(request.type())) {
            project.update(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.slug(), request.role(), request.contributionRate()
            );
        } else if (exp instanceof Education edu && "EDUCATION".equalsIgnoreCase(request.type())) {
            edu.update(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.institutionName()
            );
        } else if (exp instanceof Certificate cert && "CERTIFICATE".equalsIgnoreCase(request.type())) {
            cert.update(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.issuer()
            );
        } else {
            // 서브타입이 달라지는 경우 기존 항목을 삭제하고 새로 생성
            experienceRepository.delete(exp);
            return create(request);
        }

        return experienceRepository.save(exp);
    }

    @Transactional
    public void delete(Long id) {
        if (!experienceRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 이력서 항목입니다.");
        }
        experienceRepository.deleteById(id);
    }
}
