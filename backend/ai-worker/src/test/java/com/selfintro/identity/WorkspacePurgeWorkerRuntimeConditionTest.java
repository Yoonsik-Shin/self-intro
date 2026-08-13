package com.selfintro.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.selfintro.modules.identity.application.WorkspacePurgeExecutionStateService;
import com.selfintro.modules.identity.application.WorkspacePurgeExecutor;
import com.selfintro.modules.identity.application.WorkspacePurgeService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.convert.ApplicationConversionService;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class WorkspacePurgeWorkerRuntimeConditionTest {

    @Test
    void schedulerExistsOnlyInWorkerRuntime() {
        ApplicationContextRunner contextRunner =
                new ApplicationContextRunner()
                        .withInitializer(
                                context ->
                                        context.getBeanFactory()
                                                .setConversionService(
                                                        ApplicationConversionService
                                                                .getSharedInstance()))
                        .withBean(
                                WorkspacePurgeService.class,
                                () -> mock(WorkspacePurgeService.class))
                        .withBean(
                                WorkspacePurgeExecutionStateService.class,
                                () -> mock(WorkspacePurgeExecutionStateService.class))
                        .withBean(
                                WorkspacePurgeExecutor.class,
                                () -> mock(WorkspacePurgeExecutor.class))
                        .withUserConfiguration(WorkspacePurgeWorker.class)
                        .withPropertyValues("app.workspace-purge.execution-enabled=true");

        contextRunner
                .withPropertyValues("app.runtime-role=api")
                .run(context -> assertThat(context).doesNotHaveBean(WorkspacePurgeWorker.class));
        contextRunner
                .withPropertyValues("app.runtime-role=worker")
                .run(context -> assertThat(context).hasSingleBean(WorkspacePurgeWorker.class));
    }
}
