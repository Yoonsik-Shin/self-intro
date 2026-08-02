package com.selfintro.modules.jobapplication.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobapplication.domain.entity.JobPosting;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingRepository;
import com.selfintro.modules.jobapplication.presentation.dto.JobplanetCompanyRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class JobplanetCompanyServiceTest {

    @Mock JobPostingRepository repository;

    private JobplanetCompanyService service;
    private JobPosting posting;

    @BeforeEach
    void setUp() {
        service = new JobplanetCompanyService(repository);
        posting =
                JobPosting.registerApplied(
                        "테스트㈜",
                        "백엔드 개발자",
                        "https://example.com/job",
                        "직접입력",
                        LocalDate.now(),
                        null,
                        true,
                        null,
                        "서울",
                        "정규직",
                        null,
                        "API 개발",
                        "Java",
                        "Spring",
                        null,
                        null,
                        null,
                        LocalDateTime.now());
    }

    @Test
    void savesVerifiedJobplanetCompanyUrlAndRating() {
        when(repository.findById(1L)).thenReturn(Optional.of(posting));
        var result =
                service.save(
                        1L,
                        new JobplanetCompanyRequest(
                                new BigDecimal("3.7"),
                                120,
                                "테스트 주식회사",
                                "https://www.jobplanet.co.kr/companies/123"));

        assertThat(result.rating()).isEqualByComparingTo("3.7");
        assertThat(result.reviewCount()).isEqualTo(120);
        assertThat(result.companyUrl()).contains("jobplanet.co.kr/companies/123");
        assertThat(posting.getJobplanetCheckedAt()).isNotNull();
    }

    @Test
    void rejectsNonJobplanetUrl() {
        assertThatThrownBy(
                        () ->
                                service.save(
                                        1L,
                                        new JobplanetCompanyRequest(
                                                new BigDecimal("4.0"),
                                                1,
                                                "가짜",
                                                "https://example.com/companies/123")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("잡플래닛 기업 페이지");
    }
}
