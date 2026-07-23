package com.selfintro.modules.printtemplate.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.selfintro.modules.printtemplate.domain.PrintTemplate;
import com.selfintro.modules.printtemplate.domain.PrintTemplateRepository;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateRequest;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PrintTemplateServiceTest {
    @Mock PrintTemplateRepository repository;

    private PrintTemplateService service;

    @BeforeEach
    void setUp() {
        service = new PrintTemplateService(repository);
        when(repository.save(any(PrintTemplate.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void oldRequestGetsCompatibleContentDefaults() {
        PrintTemplateRequest request =
                new PrintTemplateRequest(
                        "기본", "[]", "[\"skills\"]", "{}", null, null, null, null, true, 1);

        PrintTemplate saved = service.create(request);

        assertThat(saved.getTargetRole()).isEqualTo("GENERAL");
        assertThat(saved.getContentOverrides()).isEqualTo("{}");
        assertThat(saved.getSchemaVersion()).isEqualTo(2);
    }

    @Test
    void updateKeepsFingerprintWhenLegacyRequestOmitsIt() {
        PrintTemplate existing =
                PrintTemplate.create(
                        "백엔드",
                        "[]",
                        "[\"skills\"]",
                        "{}",
                        "BACKEND",
                        "{\"profile\":{\"bio\":\"백엔드\"}}",
                        "v2-12345678",
                        2,
                        true,
                        1);
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        PrintTemplateRequest request =
                new PrintTemplateRequest(
                        "백엔드 수정", "[]", "[\"skills\"]", "{}", null, null, null, null, true, 1);

        PrintTemplate saved = service.update(1L, request);

        assertThat(saved.getTargetRole()).isEqualTo("BACKEND");
        assertThat(saved.getContentOverrides()).contains("백엔드");
        assertThat(saved.getBaseContentFingerprint()).isEqualTo("v2-12345678");
    }
}
