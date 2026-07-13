package com.selfintro.study.config;

import com.selfintro.study.entity.StudyCategory;
import com.selfintro.study.entity.StudyEntry;
import com.selfintro.study.repository.StudyEntryRepository;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("local")
@RequiredArgsConstructor
public class SampleDataLoader implements ApplicationRunner {

    private final StudyEntryRepository studyEntryRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (studyEntryRepository.count() > 0) {
            return;
        }

        studyEntryRepository.save(StudyEntry.create(
                "Spring Boot + JPA 학습 기록 API",
                "학습한 내용을 등록하고 조회하는 REST API를 계층형 구조로 구현했습니다.",
                StudyCategory.PROJECT,
                List.of("Java", "Spring Boot", "JPA", "QueryDSL"),
                "조회 조건은 QueryDSL로 분리하고 도메인 생성 규칙은 엔티티 팩토리로 모았습니다.",
                LocalDate.now()
        ));
    }
}
