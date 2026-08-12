package com.selfintro.vectorsearch.infrastructure;

import com.selfintro.vectorsearch.application.ProfileVectorSearchPort;
import com.selfintro.vectorsearch.domain.repository.ExperienceVectorRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OracleProfileVectorSearchAdapter implements ProfileVectorSearchPort {

    private final ExperienceVectorRepository repository;

    @Override
    public List<ExperienceMatch> findTopSimilarExperienceChunks(
            Long workspaceId, String queryVector, int limit) {
        return repository.findTopSimilarExperienceChunks(workspaceId, queryVector, limit).stream()
                .map(
                        match ->
                                new ExperienceMatch(
                                        match.getId(),
                                        match.getExperienceId(),
                                        match.getChunkContent(),
                                        match.getDistance()))
                .toList();
    }
}
