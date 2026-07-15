package com.selfintro.modules.experience.application;

import com.selfintro.modules.experience.domain.*;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceRequest;
import com.selfintro.study.entity.Tag;
import com.selfintro.study.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.IntStream;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExperienceService {

    private final ExperienceRepository experienceRepository;
    private final SkillRepository skillRepository;
    private final TagRepository tagRepository;

    public List<Experience> getAllExperiences() {
        return experienceRepository.findAllByOrderByDisplayOrderAsc();
    }

    @Transactional
    public Experience create(ExperienceRequest request) {
        List<Skill> skills = request.skillIds() != null
            ? skillRepository.findAllById(request.skillIds())
            : List.of();

        List<ExperienceDetail.Draft> details = toDetailDrafts(request.details());

        Experience exp;
        switch (request.type().toUpperCase()) {
            case "CAREER" -> exp = Career.create(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.showOnTimeline(), request.timelineLabel(),
                request.companyName(), request.employmentType(), request.department(), request.role()
            );
            case "PROJECT" -> exp = Project.create(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.showOnTimeline(), request.timelineLabel(),
                request.slug(), request.role(), request.contributionRate(), normalizeOptionalText(request.repositoryUrl())
            );
            case "EDUCATION" -> exp = Education.create(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.showOnTimeline(), request.timelineLabel(),
                request.institutionName()
            );
            case "CERTIFICATE" -> exp = Certificate.create(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.showOnTimeline(), request.timelineLabel(),
                request.issuer()
            );
            default -> throw new IllegalArgumentException("지원하지 않는 이력서 서브타입입니다: " + request.type());
        }

        Experience saved = experienceRepository.save(exp);
        saved.replaceTags(resolveTags(request.tagNames()));
        return saved;
    }

    @Transactional
    public Experience update(Long id, ExperienceRequest request) {
        Experience exp = experienceRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이력서 항목입니다."));

        List<Skill> skills = request.skillIds() != null
            ? skillRepository.findAllById(request.skillIds())
            : List.of();

        List<ExperienceDetail.Draft> details = toDetailDrafts(request.details());

        if (exp instanceof Career career && "CAREER".equalsIgnoreCase(request.type())) {
            career.update(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.showOnTimeline(), request.timelineLabel(),
                request.companyName(), request.employmentType(), request.department(), request.role()
            );
        } else if (exp instanceof Project project && "PROJECT".equalsIgnoreCase(request.type())) {
            project.update(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.showOnTimeline(), request.timelineLabel(),
                request.slug(), request.role(), request.contributionRate(), normalizeOptionalText(request.repositoryUrl())
            );
        } else if (exp instanceof Education edu && "EDUCATION".equalsIgnoreCase(request.type())) {
            edu.update(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.showOnTimeline(), request.timelineLabel(),
                request.institutionName()
            );
        } else if (exp instanceof Certificate cert && "CERTIFICATE".equalsIgnoreCase(request.type())) {
            cert.update(
                request.title(), request.periodStart(), request.periodEnd(), request.summary(), request.takeaway(), request.essayContent(), request.displayOrder(), details, skills,
                request.showOnTimeline(), request.timelineLabel(),
                request.issuer()
            );
        } else {
            // 서브타입이 달라지는 경우 기존 항목을 삭제하고 새로 생성
            experienceRepository.delete(exp);
            return create(request);
        }

        exp.replaceTags(resolveTags(request.tagNames()));
        return experienceRepository.save(exp);
    }

    @Transactional
    public void delete(Long id) {
        if (!experienceRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 이력서 항목입니다.");
        }
        experienceRepository.deleteById(id);
    }

    private String normalizeOptionalText(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private List<Tag> resolveTags(List<String> tagNames) {
        if (tagNames == null) {
            return List.of();
        }
        Set<String> normalizedNames = new LinkedHashSet<>();
        tagNames.stream()
            .filter(StringUtils::hasText)
            .map(String::trim)
            .forEach(normalizedNames::add);

        List<Tag> result = new ArrayList<>();
        for (String name : normalizedNames) {
            result.add(tagRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> tagRepository.save(Tag.create(name, uniqueTagSlug(name)))));
        }
        return result;
    }

    private String uniqueTagSlug(String name) {
        String base = slugify(name);
        if (!StringUtils.hasText(base)) {
            base = "tag";
        }
        String candidate = base;
        int suffix = 2;
        while (tagRepository.existsBySlug(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private String slugify(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFKC)
            .toLowerCase(Locale.ROOT)
            .trim()
            .replaceAll("[^\\p{L}\\p{N}]+", "-")
            .replaceAll("^-+|-+$", "");
    }

    private List<ExperienceDetail.Draft> toDetailDrafts(List<ExperienceDetailRequest> detailRequests) {
        if (detailRequests == null) {
            return List.of();
        }
        return IntStream.range(0, detailRequests.size())
            .mapToObj(i -> {
                ExperienceDetailRequest dr = detailRequests.get(i);
                List<Skill> detailSkills = dr.skillIds() != null
                    ? skillRepository.findAllById(dr.skillIds())
                    : List.of();
                return new ExperienceDetail.Draft(dr.id(), dr.content(), dr.situation(), dr.actionDetail(), dr.outcome(), i, detailSkills);
            })
            .toList();
    }
}
