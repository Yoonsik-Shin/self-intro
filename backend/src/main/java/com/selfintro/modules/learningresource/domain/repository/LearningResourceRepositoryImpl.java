package com.selfintro.modules.learningresource.domain.repository;

import static com.selfintro.modules.learningresource.domain.entity.QLearningResource.learningResource;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

@RequiredArgsConstructor
public class LearningResourceRepositoryImpl implements LearningResourceRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<LearningResource> search(
            LearningResourceSearchCondition condition, Pageable pageable) {
        BooleanBuilder where = new BooleanBuilder();
        where.and(keywordContains(condition.keyword()));
        if (StringUtils.hasText(condition.category())) {
            where.and(learningResource.category.slug.eq(condition.category()));
        }
        if (condition.tags() != null && !condition.tags().isEmpty()) {
            where.and(learningResource.tags.any().slug.in(condition.tags()));
        }
        if (condition.skillIds() != null && !condition.skillIds().isEmpty()) {
            where.and(learningResource.skills.any().id.in(condition.skillIds()));
        }
        if (condition.resourceType() != null) {
            where.and(learningResource.resourceType.eq(condition.resourceType()));
        }
        if (condition.status() != null) {
            where.and(learningResource.status.eq(condition.status()));
        }
        if (condition.priorityTier() != null) {
            where.and(learningResource.priorityTier.eq(condition.priorityTier()));
        }

        List<LearningResource> content =
                queryFactory
                        .selectFrom(learningResource)
                        .where(where)
                        .orderBy(learningResource.displayOrder.asc(), learningResource.id.desc())
                        .offset(pageable.getOffset())
                        .limit(pageable.getPageSize())
                        .fetch();

        Long total =
                queryFactory
                        .select(learningResource.id.countDistinct())
                        .from(learningResource)
                        .where(where)
                        .fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    private BooleanExpression keywordContains(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return null;
        }
        String value = keyword.trim();
        return learningResource
                .title
                .containsIgnoreCase(value)
                .or(learningResource.summary.containsIgnoreCase(value))
                .or(learningResource.detailMarkdown.containsIgnoreCase(value))
                .or(learningResource.tags.any().name.containsIgnoreCase(value))
                .or(learningResource.skills.any().name.containsIgnoreCase(value))
                .or(learningResource.provider.containsIgnoreCase(value))
                .or(learningResource.instructorOrAuthor.containsIgnoreCase(value));
    }
}
