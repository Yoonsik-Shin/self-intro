package com.selfintro.modules.donation.application;

import com.selfintro.modules.donation.config.DonationProperties;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@Component
@RequiredArgsConstructor
public class PayAppClient {
    private final RestClient payAppRestClient;
    private final DonationProperties properties;

    public PayAppPayRequestResult payRequest(int amount, String clientToken) {
        ensureConfigured();
        DonationProperties.PayApp payapp = properties.payapp();
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("cmd", "payrequest");
        form.add("userid", payapp.userId());
        form.add("goodname", "포트폴리오 후원");
        form.add("price", String.valueOf(amount));
        form.add("recvphone", payapp.recvPhone());
        form.add("smsuse", "n");
        form.add("feedbackurl", payapp.feedbackUrl());
        form.add("returnurl", payapp.returnUrl());
        form.add("var1", clientToken);
        Map<String, String> response = post(form);
        if (!"1".equals(response.get("state"))) {
            return PayAppPayRequestResult.fail(response.getOrDefault("errorMessage", "unknown"));
        }
        String mulNo = response.get("mul_no");
        String payUrl = response.get("payurl");
        if (mulNo == null || mulNo.isBlank() || payUrl == null || payUrl.isBlank()) {
            return PayAppPayRequestResult.fail("mul_no 또는 payurl 누락");
        }
        return PayAppPayRequestResult.ok(mulNo, payUrl);
    }

    /** 결제 취소(전액). 실패 시 에러 메시지를 담은 예외를 던진다. */
    public void payCancel(String mulNo, String memo) {
        ensureConfigured();
        DonationProperties.PayApp payapp = properties.payapp();
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("cmd", "paycancel");
        form.add("userid", payapp.userId());
        form.add("linkkey", payapp.linkKey());
        form.add("mul_no", mulNo);
        form.add("cancelmemo", memo);
        Map<String, String> response = post(form);
        if (!"1".equals(response.get("state"))) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "페이앱 결제취소에 실패했습니다: " + response.getOrDefault("errorMessage", "unknown"));
        }
    }

    private Map<String, String> post(MultiValueMap<String, String> form) {
        try {
            String body = payAppRestClient.post()
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(String.class);
            return parse(body);
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "페이앱 API 호출에 실패했습니다.", exception);
        }
    }

    private void ensureConfigured() {
        if (!properties.payapp().isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "후원 기능을 사용하려면 페이앱 연동 정보가 설정되어 있어야 합니다.");
        }
    }

    /** 페이앱 응답은 url-encoded key=value 나열이다 (예: state=1&mul_no=123&payurl=...). */
    static Map<String, String> parse(String body) {
        Map<String, String> parsed = new HashMap<>();
        if (body == null || body.isBlank()) {
            return parsed;
        }
        for (String pair : body.split("&")) {
            int separator = pair.indexOf('=');
            if (separator <= 0) continue;
            String key = URLDecoder.decode(pair.substring(0, separator), StandardCharsets.UTF_8);
            String value = URLDecoder.decode(pair.substring(separator + 1), StandardCharsets.UTF_8);
            parsed.put(key, value);
        }
        return parsed;
    }
}
