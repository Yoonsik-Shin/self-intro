package com.selfintro.study.repository;

import static com.selfintro.study.entity.QStudy.study;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.selfintro.study.entity.Study;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

@RequiredArgsConstructor
public class StudyRepositoryImpl implements StudyRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Study> search(StudySearchCondition condition, Pageable pageable) {
        BooleanBuilder where = new BooleanBuilder();
        where.and(keywordContains(condition.keyword()));
        if (StringUtils.hasText(condition.category())) {
            where.and(study.category.slug.eq(condition.category()));
        }
        if (condition.tags() != null && !condition.tags().isEmpty()) {
            where.and(study.tags.any().slug.in(condition.tags()));
        }
        if (condition.skillIds() != null && !condition.skillIds().isEmpty()) {
            where.and(study.skills.any().id.in(condition.skillIds()));
        }
        if (condition.experienceIds() != null && !condition.experienceIds().isEmpty()) {
            where.and(study.experiences.any().id.in(condition.experienceIds()));
        }
        if (condition.experienceDetailIds() != null && !condition.experienceDetailIds().isEmpty()) {
            where.and(study.experienceDetails.any().id.in(condition.experienceDetailIds()));
        }
        if (condition.status() != null) {
            where.and(study.status.eq(condition.status()));
        }

        List<Study> content = queryFactory
                .selectFrom(study)
                .where(where)
                .orderBy(study.learnedAt.desc(), study.id.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(study.id.countDistinct())
                .from(study)
                .where(where)
                .fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    private BooleanExpression keywordContains(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return null;
        }
        String value = keyword.trim();
        return study.title.containsIgnoreCase(value)
                .or(study.summary.containsIgnoreCase(value))
                .or(study.contentMarkdown.containsIgnoreCase(value))
                .or(study.tags.any().name.containsIgnoreCase(value))
                .or(study.skills.any().name.containsIgnoreCase(value))
                .or(study.experiences.any().title.containsIgnoreCase(value));
    }
}
