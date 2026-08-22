package com.selfintro.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

class StaticSecretFileEnvironmentPostProcessorTest {

    @TempDir Path directory;

    @Test
    void loadsFilesAndPreservesExistingEnvironmentPrecedence() throws Exception {
        Files.writeString(directory.resolve("SPRING_MAIL_PASSWORD"), "from-file\n");
        StandardEnvironment environment = new StandardEnvironment();
        environment
                .getPropertySources()
                .replace(
                        StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                        new MapPropertySource(
                                StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                                Map.of("SPRING_MAIL_PASSWORD", "from-environment")));
        environment
                .getPropertySources()
                .addFirst(
                        new MapPropertySource(
                                "testConfig",
                                Map.of(
                                        "STATIC_SECRET_DIRECTORY",
                                        directory.toString(),
                                        "STATIC_SECRET_REQUIRED_KEYS",
                                        "SPRING_MAIL_PASSWORD")));

        new StaticSecretFileEnvironmentPostProcessor()
                .postProcessEnvironment(environment, new SpringApplication());

        assertThat(environment.getProperty("SPRING_MAIL_PASSWORD")).isEqualTo("from-environment");
        assertThat(
                        environment
                                .getPropertySources()
                                .get(StaticSecretFileEnvironmentPostProcessor.PROPERTY_SOURCE_NAME)
                                .getProperty("SPRING_MAIL_PASSWORD"))
                .isEqualTo("from-file");
    }

    @Test
    void failsClosedWhenARequiredFileIsMissing() {
        StandardEnvironment environment = new StandardEnvironment();
        environment
                .getPropertySources()
                .addFirst(
                        new MapPropertySource(
                                "testConfig",
                                Map.of(
                                        "STATIC_SECRET_DIRECTORY",
                                        directory.toString(),
                                        "STATIC_SECRET_REQUIRED_KEYS",
                                        "DB_PASSWORD")));

        assertThatThrownBy(
                        () ->
                                new StaticSecretFileEnvironmentPostProcessor()
                                        .postProcessEnvironment(
                                                environment, new SpringApplication()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DB_PASSWORD");
    }

    @Test
    void rejectsUnsafeFileNames() throws Exception {
        Files.writeString(directory.resolve("safe"), "value");

        assertThatThrownBy(() -> StaticSecretFileEnvironmentPostProcessor.loadDirectory(directory))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Invalid static secret file name");
    }

    @Test
    void rejectsSymbolicLinks() throws Exception {
        Path outside = Files.writeString(directory.resolveSibling("outside-secret"), "value");
        try {
            Files.createSymbolicLink(directory.resolve("SPRING_MAIL_PASSWORD"), outside);

            assertThatThrownBy(
                            () -> StaticSecretFileEnvironmentPostProcessor.loadDirectory(directory))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("not a regular file");
        } finally {
            Files.deleteIfExists(outside);
        }
    }
}
