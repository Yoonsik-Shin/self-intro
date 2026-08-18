package com.selfintro.modules.jobposting.application;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobposting.presentation.dto.JobplanetCompanyRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobplanetLookupResponse;
import jakarta.persistence.EntityNotFoundException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobplanetCompanyService {

    private final JobPostingRepository jobPostingRepository;

    public JobplanetLookupResponse get(Long jobPostingId) {
        return toResponse(find(jobPostingId));
    }

    @Transactional
    public JobplanetLookupResponse save(Long jobPostingId, JobplanetCompanyRequest request) {
        validateCompanyUrl(request.companyUrl());
        JobPosting posting = find(jobPostingId);
        posting.updateJobplanet(
                request.rating(),
                request.reviewCount(),
                request.companyName().trim(),
                request.companyUrl().trim(),
                LocalDateTime.now());
        return toResponse(posting);
    }

    @Transactional
    public JobplanetLookupResponse clear(Long jobPostingId) {
        JobPosting posting = find(jobPostingId);
        posting.clearJobplanet(LocalDateTime.now());
        return toResponse(posting);
    }

    private JobPosting find(Long id) {
        return jobPostingRepository
                .findByIdAndOwnerWorkspaceIdIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 채용 공고입니다: " + id));
    }

    private JobplanetLookupResponse toResponse(JobPosting posting) {
        String query = URLEncoder.encode(posting.getCompanyName(), StandardCharsets.UTF_8);
        return new JobplanetLookupResponse(
                posting.getId(),
                posting.getCompanyName(),
                "https://www.jobplanet.co.kr/search/companies?query=" + query,
                posting.getJobplanetRating(),
                posting.getJobplanetReviewCount(),
                posting.getJobplanetCompanyName(),
                posting.getJobplanetCompanyUrl(),
                posting.getJobplanetCheckedAt());
    }

    private void validateCompanyUrl(String rawUrl) {
        try {
            URI uri = URI.create(rawUrl.trim());
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (!"https".equalsIgnoreCase(uri.getScheme())
                    || !(host.equals("jobplanet.co.kr") || host.endsWith(".jobplanet.co.kr"))) {
                throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "잡플래닛 기업 페이지의 HTTPS URL을 입력해주세요.", exception);
        }
    }
}
