package com.selfintro.bff.application;

import com.selfintro.bff.presentation.dto.IntroductionResponse;
import com.selfintro.modules.identity.publication.application.WorkspacePublishedContentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BffService {
    private final WorkspacePublishedContentService publishedContentService;

    public IntroductionResponse getIntroduction(Long workspaceId, IntroductionChannel channel) {
        return publishedContentService.introduction(workspaceId, channel);
    }
}
