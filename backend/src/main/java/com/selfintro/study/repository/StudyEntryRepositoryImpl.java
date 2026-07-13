package com.selfintro.study.repository;

import static com.selfintro.study.entity.QStudyEntry.studyEntry;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.selfintro.study.entity.StudyCategory;
import com.selfintro.study.entity.StudyEntry;
import java.util.List;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class StudyEntryRepositoryImpl implements StudyEntryRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<StudyEntry> search(StudyCategory category) {
        return queryFactory
                .selectFrom(studyEntry)
                .where(categoryEq(category))
                .orderBy(studyEntry.learnedAt.desc(), studyEntry.id.desc())
                .fetch();
    }

    private BooleanExpression categoryEq(StudyCategory category) {
        return category == null ? null : studyEntry.category.eq(category);
    }
}
