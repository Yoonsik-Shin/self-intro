package com.selfintro.global.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.util.StringUtils;

/** Loads one secret per file before application configuration placeholders are resolved. */
public final class StaticSecretFileEnvironmentPostProcessor
        implements EnvironmentPostProcessor, Ordered {

    static final String DIRECTORY_PROPERTY = "STATIC_SECRET_DIRECTORY";
    static final String REQUIRED_PROPERTY = "STATIC_SECRET_DIRECTORY_REQUIRED";
    static final String REQUIRED_KEYS_PROPERTY = "STATIC_SECRET_REQUIRED_KEYS";
    static final String PROPERTY_SOURCE_NAME = "staticSecretFiles";
    private static final Pattern KEY_PATTERN = Pattern.compile("[A-Z][A-Z0-9_]*");

    @Override
    public void postProcessEnvironment(
            ConfigurableEnvironment environment, SpringApplication application) {
        String configuredDirectory = environment.getProperty(DIRECTORY_PROPERTY);
        boolean required = environment.getProperty(REQUIRED_PROPERTY, Boolean.class, false);
        if (!StringUtils.hasText(configuredDirectory)) {
            if (required) {
                throw new IllegalStateException(DIRECTORY_PROPERTY + " must be configured");
            }
            return;
        }

        Map<String, Object> values = loadDirectory(Path.of(configuredDirectory));
        validateRequiredKeys(values, environment.getProperty(REQUIRED_KEYS_PROPERTY));
        addBelowSystemEnvironment(environment.getPropertySources(), values);
    }

    static Map<String, Object> loadDirectory(Path directory) {
        if (!Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS)) {
            throw new IllegalStateException("Static secret directory is missing or unsafe");
        }

        Map<String, Object> values = new LinkedHashMap<>();
        try (Stream<Path> paths = Files.list(directory)) {
            List<Path> files = paths.sorted().toList();
            for (Path file : files) {
                String key = file.getFileName().toString();
                if (!KEY_PATTERN.matcher(key).matches()) {
                    throw new IllegalStateException("Invalid static secret file name: " + key);
                }
                if (!Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)) {
                    throw new IllegalStateException(
                            "Static secret entry is not a regular file: " + key);
                }
                String value =
                        stripSingleTrailingLineBreak(
                                Files.readString(file, StandardCharsets.UTF_8));
                if (value.indexOf('\0') >= 0) {
                    throw new IllegalStateException("Static secret contains a NUL byte: " + key);
                }
                values.put(key, value);
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to read static secret directory", exception);
        }
        return values;
    }

    private static void validateRequiredKeys(Map<String, Object> values, String configuredKeys) {
        if (!StringUtils.hasText(configuredKeys)) {
            return;
        }
        List<String> missing =
                Arrays.stream(configuredKeys.split(","))
                        .map(String::trim)
                        .filter(StringUtils::hasText)
                        .filter(key -> !values.containsKey(key))
                        .toList();
        if (!missing.isEmpty()) {
            throw new IllegalStateException("Required static secret files are missing: " + missing);
        }
    }

    private static void addBelowSystemEnvironment(
            MutablePropertySources sources, Map<String, Object> values) {
        MapPropertySource propertySource = new MapPropertySource(PROPERTY_SOURCE_NAME, values);
        if (sources.contains(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME)) {
            sources.addAfter(
                    StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME, propertySource);
        } else {
            sources.addFirst(propertySource);
        }
    }

    private static String stripSingleTrailingLineBreak(String value) {
        if (value.endsWith("\r\n")) {
            return value.substring(0, value.length() - 2);
        }
        if (value.endsWith("\n")) {
            return value.substring(0, value.length() - 1);
        }
        return value;
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 20;
    }
}
