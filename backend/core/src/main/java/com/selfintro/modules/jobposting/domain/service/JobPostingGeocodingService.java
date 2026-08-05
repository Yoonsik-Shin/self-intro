package com.selfintro.modules.jobposting.domain.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class JobPostingGeocodingService {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String kakaoRestApiKey;

    public JobPostingGeocodingService(
            ObjectMapper objectMapper,
            @Value("${kakao.rest-api-key:}") String kakaoRestApiKey) {
        this.objectMapper = objectMapper;
        this.kakaoRestApiKey = kakaoRestApiKey;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public record Coordinates(BigDecimal latitude, BigDecimal longitude) {}

    public Optional<Coordinates> geocode(String rawAddress) {
        if (rawAddress == null || rawAddress.trim().isEmpty()) {
            return Optional.empty();
        }

        String cleanedAddress = cleanAddress(rawAddress);
        if (cleanedAddress.trim().isEmpty()) {
            return Optional.empty();
        }

        // 1. 카카오 REST API 키가 있는 경우 우선 시도
        if (kakaoRestApiKey != null && !kakaoRestApiKey.trim().isEmpty()) {
            Optional<Coordinates> kakaoResult = tryKakaoGeocode(cleanedAddress);
            if (kakaoResult.isPresent()) {
                return kakaoResult;
            }
        }

        // 2. OpenStreetMap Nominatim 서비스 폴백
        Optional<Coordinates> osmResult = tryOsmGeocode(cleanedAddress);
        if (osmResult.isPresent()) {
            return osmResult;
        }

        // 3. 주소가 너무 세부적이어서 실패한 경우 시/구/동 정규화 후 2차 시도
        String simplifiedAddress = simplifyAddress(cleanedAddress);
        if (!simplifiedAddress.equals(cleanedAddress) && !simplifiedAddress.trim().isEmpty()) {
            if (kakaoRestApiKey != null && !kakaoRestApiKey.trim().isEmpty()) {
                Optional<Coordinates> kakaoResult = tryKakaoGeocode(simplifiedAddress);
                if (kakaoResult.isPresent()) {
                    return kakaoResult;
                }
            }
            return tryOsmGeocode(simplifiedAddress);
        }

        return Optional.empty();
    }

    private Optional<Coordinates> tryKakaoGeocode(String address) {
        try {
            String encoded = URLEncoder.encode(address, StandardCharsets.UTF_8);
            URI uri = URI.create("https://dapi.kakao.com/v2/local/search/address.json?query=" + encoded);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .header("Authorization", "KakaoAK " + kakaoRestApiKey.trim())
                    .GET()
                    .timeout(Duration.ofSeconds(3))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode documents = root.path("documents");
                if (documents.isArray() && !documents.isEmpty()) {
                    JsonNode doc = documents.get(0);
                    double lng = doc.path("x").asDouble();
                    double lat = doc.path("y").asDouble();
                    return Optional.of(new Coordinates(
                            BigDecimal.valueOf(lat).setScale(7, RoundingMode.HALF_UP),
                            BigDecimal.valueOf(lng).setScale(7, RoundingMode.HALF_UP)
                    ));
                }
            }
        } catch (Exception e) {
            log.warn("Kakao Geocoding error for address: {}", address, e);
        }
        return Optional.empty();
    }

    private Optional<Coordinates> tryOsmGeocode(String address) {
        try {
            String encoded = URLEncoder.encode(address, StandardCharsets.UTF_8);
            URI uri = URI.create("https://nominatim.openstreetmap.org/search?q=" + encoded + "&format=json&limit=1");
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .header("User-Agent", "SelfIntroJobPostingMap/1.0 (contact@selfintro.com)")
                    .GET()
                    .timeout(Duration.ofSeconds(3))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode array = objectMapper.readTree(response.body());
                if (array.isArray() && !array.isEmpty()) {
                    JsonNode item = array.get(0);
                    double lat = item.path("lat").asDouble();
                    double lng = item.path("lon").asDouble();
                    return Optional.of(new Coordinates(
                            BigDecimal.valueOf(lat).setScale(7, RoundingMode.HALF_UP),
                            BigDecimal.valueOf(lng).setScale(7, RoundingMode.HALF_UP)
                    ));
                }
            }
        } catch (Exception e) {
            log.warn("OSM Geocoding error for address: {}", address, e);
        }
        return Optional.empty();
    }

    private String cleanAddress(String raw) {
        if (raw == null) return "";
        return raw.replaceAll("\\(.*\\)", "")
                .replaceAll("[\\[\\]~]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String simplifyAddress(String address) {
        String[] tokens = address.split(" ");
        if (tokens.length <= 2) {
            return address;
        }
        return String.join(" ", tokens[0], tokens[1], tokens[2]);
    }
}
