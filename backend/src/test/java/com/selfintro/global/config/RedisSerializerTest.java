package com.selfintro.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.databind.jsontype.PolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.selfintro.bff.presentation.dto.IntroductionResponse;
import com.selfintro.modules.profile.presentation.dto.ProfileResponse;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializer;

class RedisSerializerTest {

    public static RedisSerializer<Object> createRedisValueSerializer() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        PolymorphicTypeValidator ptv =
                BasicPolymorphicTypeValidator.builder()
                        .allowIfBaseType(Object.class)
                        .allowIfSubType(Object.class)
                        .build();

        @SuppressWarnings("deprecation")
        ObjectMapper.DefaultTyping defaultTyping = ObjectMapper.DefaultTyping.EVERYTHING;

        objectMapper.activateDefaultTyping(ptv, defaultTyping, JsonTypeInfo.As.PROPERTY);

        return new GenericJackson2JsonRedisSerializer(objectMapper);
    }

    @Test
    @DisplayName("Default GenericJackson2JsonRedisSerializer fails on LocalDateTime")
    void defaultSerializerFailsOnLocalDateTime() {
        GenericJackson2JsonRedisSerializer defaultSerializer =
                new GenericJackson2JsonRedisSerializer();
        ProfileResponse profile =
                new ProfileResponse(
                        1L,
                        "Test",
                        "Test EN",
                        "Developer",
                        "Bio",
                        "Summary",
                        "Badge",
                        "github",
                        "test@test.com",
                        "010-0000-0000",
                        LocalDateTime.now());
        IntroductionResponse response =
                new IntroductionResponse(profile, List.of(), List.of(), List.of(), "3년", List.of());

        assertThatThrownBy(() -> defaultSerializer.serialize(response))
                .isInstanceOf(
                        org.springframework.data.redis.serializer.SerializationException.class);
    }

    @Test
    @DisplayName(
            "Configured RedisSerializer successfully serializes and deserializes Java 8 LocalDateTime in IntroductionResponse record")
    void configuredSerializerHandlesLocalDateTimeAndRecords() {
        RedisSerializer<Object> serializer = createRedisValueSerializer();

        LocalDateTime now = LocalDateTime.now();
        ProfileResponse profile =
                new ProfileResponse(
                        1L,
                        "Test",
                        "Test EN",
                        "Developer",
                        "Bio",
                        "Summary",
                        "Badge",
                        "github",
                        "test@test.com",
                        "010-0000-0000",
                        now);
        IntroductionResponse response =
                new IntroductionResponse(profile, List.of(), List.of(), List.of(), "3년", List.of());

        byte[] serialized = serializer.serialize(response);
        assertThat(serialized).isNotNull().isNotEmpty();

        Object deserializedObj = serializer.deserialize(serialized);
        assertThat(deserializedObj).isNotNull().isInstanceOf(IntroductionResponse.class);

        IntroductionResponse deserialized = (IntroductionResponse) deserializedObj;
        assertThat(deserialized.profile().name()).isEqualTo("Test");
        assertThat(deserialized.profile().updatedAt()).isEqualTo(now);
    }
}
