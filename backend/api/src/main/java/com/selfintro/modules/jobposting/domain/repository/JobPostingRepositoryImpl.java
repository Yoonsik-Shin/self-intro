package com.selfintro.modules.jobposting.domain.repository;

import static com.selfintro.modules.jobposting.domain.entity.QJobPosting.jobPosting;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionBasis;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionReviewStatus;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.util.StringUtils;

@RequiredArgsConstructor
public class JobPostingRepositoryImpl implements JobPostingRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    private static final List<JobPostingPermissionBasis> SHAREABLE_BASES =
            Arrays.stream(JobPostingPermissionBasis.values())
                    .filter(JobPostingPermissionBasis::isShareable)
                    .toList();

    @Override
    public Page<JobPosting> findSharedCatalog(
            String keyword, LocalDateTime now, Pageable pageable) {
        BooleanBuilder where = new BooleanBuilder();

        // 1. 공통 카탈로그 노출 조건 (isSharedCatalogEligible)
        where.and(jobPosting.ownerWorkspaceId.isNull());
        where.and(
                jobPosting.permissionReviewStatus.eq(JobPostingPermissionReviewStatus.APPROVED));
        where.and(jobPosting.permissionBasis.in(SHAREABLE_BASES));
        where.and(jobPosting.permissionEvidenceReference.isNotNull());
        where.and(jobPosting.permissionEvidenceReference.trim().ne(""));
        where.and(jobPosting.permissionGrantorName.isNotNull());
        where.and(jobPosting.permissionGrantorName.trim().ne(""));
        where.and(jobPosting.permissionGrantorAuthority.isNotNull());
        where.and(jobPosting.permissionGrantorAuthority.trim().ne(""));
        where.and(jobPosting.permissionScopeNote.isNotNull());
        where.and(jobPosting.permissionScopeNote.trim().ne(""));
        where.and(
                jobPosting
                        .permissionExpiresAt
                        .isNull()
                        .or(jobPosting.permissionExpiresAt.gt(now)));

        // 2. 키워드 검색 조건
        where.and(keywordContains(keyword));

        // 3. 본문 조회
        JPAQuery<JobPosting> query =
                queryFactory
                        .selectFrom(jobPosting)
                        .where(where)
                        .offset(pageable.getOffset())
                        .limit(pageable.getPageSize());

        applySorting(query, pageable.getSort());

        List<JobPosting> content = query.fetch();

        // 4. Count 쿼리 최적화
        JPAQuery<Long> countQuery =
                queryFactory
                        .select(jobPosting.id.countDistinct())
                        .from(jobPosting)
                        .where(where);

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }

    @Override
    public Page<JobPosting> findAdminPostings(
            String keyword,
            JobPostingPermissionReviewStatus reviewStatus,
            Pageable pageable) {
        BooleanBuilder where = new BooleanBuilder();
        where.and(jobPosting.ownerWorkspaceId.isNull());
        where.and(jobPosting.status.ne(JobPostingStatus.EXPIRED));
        if (reviewStatus != null) {
            where.and(jobPosting.permissionReviewStatus.eq(reviewStatus));
        }
        where.and(keywordContains(keyword));

        JPAQuery<JobPosting> query =
                queryFactory
                        .selectFrom(jobPosting)
                        .where(where)
                        .offset(pageable.getOffset())
                        .limit(pageable.getPageSize());

        applySorting(query, pageable.getSort());

        List<JobPosting> content = query.fetch();

        JPAQuery<Long> countQuery =
                queryFactory
                        .select(jobPosting.id.countDistinct())
                        .from(jobPosting)
                        .where(where);

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }

    private BooleanExpression keywordContains(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return null;
        }
        String value = keyword.trim();
        return jobPosting
                .companyName
                .containsIgnoreCase(value)
                .or(jobPosting.positionTitle.containsIgnoreCase(value))
                .or(jobPosting.jobDescription.containsIgnoreCase(value))
                .or(jobPosting.requiredQualifications.containsIgnoreCase(value))
                .or(jobPosting.preferredQualifications.containsIgnoreCase(value));
    }

    private void applySorting(JPAQuery<JobPosting> query, Sort sort) {
        if (sort.isUnsorted()) {
            query.orderBy(jobPosting.createdAt.desc(), jobPosting.id.desc());
            return;
        }

        for (Sort.Order order : sort) {
            OrderSpecifier<?> orderSpecifier =
                    switch (order.getProperty()) {
                        case "companyName" ->
                                order.isAscending()
                                        ? jobPosting.companyName.asc()
                                        : jobPosting.companyName.desc();
                        case "positionTitle" ->
                                order.isAscending()
                                        ? jobPosting.positionTitle.asc()
                                        : jobPosting.positionTitle.desc();
                        case "deadline" ->
                                order.isAscending()
                                        ? jobPosting.deadline.asc()
                                        : jobPosting.deadline.desc();
                        case "matchScore" ->
                                order.isAscending()
                                        ? jobPosting.matchScore.asc()
                                        : jobPosting.matchScore.desc();
                        default ->
                                order.isAscending()
                                        ? jobPosting.createdAt.asc()
                                        : jobPosting.createdAt.desc();
                    };
            query.orderBy(orderSpecifier);
        }
        query.orderBy(jobPosting.id.desc());
    }
}
