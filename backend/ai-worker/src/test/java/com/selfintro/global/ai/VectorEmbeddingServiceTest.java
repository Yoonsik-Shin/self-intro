package com.selfintro.global.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.ai.embedding.EmbeddingModel;

class VectorEmbeddingServiceTest {

    private final EmbeddingModel embeddingModel = mock(EmbeddingModel.class);
    private final VectorEmbeddingService service = new VectorEmbeddingService(embeddingModel);

    @Test
    void strictExternalEmbeddingReturnsOnlyProviderVector() {
        when(embeddingModel.embed("private study")).thenReturn(new float[] {0.1f, -0.2f});

        assertThat(service.embedToVectorStringStrictExternal("private study"))
                .isEqualTo("[0.100000,-0.200000]");
    }

    @Test
    void strictExternalEmbeddingDoesNotHideProviderFailureWithFallback() {
        when(embeddingModel.embed("private study"))
                .thenThrow(new IllegalStateException("provider unavailable"));

        assertThatThrownBy(() -> service.embedToVectorStringStrictExternal("private study"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("provider unavailable");
    }
}
