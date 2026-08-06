package com.selfintro.jobposting.application;

import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.LlmDispatcher;
import com.selfintro.vectorsearch.application.RelevantProfileDigestService;
import com.selfintro.vectorsearch.application.RelevantProfileDigestService.TopK;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 채용 공고(회사/직무/담당업무/자격요건/우대사항)를 지원자의 경력·프로젝트·핵심역량 데이터와 대조해, 어떤 경험을 근거로 무엇을 어필하면 좋을지 AI로 정리한다. 수집된 공고
 * 후보({@link JobPostingAppealService})와 이미 등록된 지원 공고({@link JobApplicationAppealService}) 양쪽에서 공유하는
 * 분석 로직이라 이 클래스로 뽑아냈다.
 */
@Service
@RequiredArgsConstructor
public class CareerAppealAnalyzer {

    private static final String APPEAL_PROMPT =
            """
            당신은 채용 공고와 지원자의 경력을 비교해 지원 전략을 조언하는 커리어 코치입니다.
            입력으로 지원자 프로필(경력/프로젝트 요약, 각 경험의 세부 내용, 핵심역량과 그 근거)과
            채용 공고(직무, 담당업무, 자격요건, 우대사항)가 주어집니다.
            프로필에 실제로 있는 사실만 근거로 삼아 답하고, 프로필에 없는 경험이나 능력을 지어내지
            마세요. 특정 항목에 대응되는 경험이 프로필에 없다면 억지로 연결 짓지 말고 솔직하게
            보완이 필요하다고 말하세요.
            반드시 아래 마크다운 구조로, 한국어로 답하세요.

            ## 어필하기 좋은 포인트
            (자격요건/우대사항과 실제로 연결되는 경험이 있는 만큼, 각 포인트마다 굵게 강조한 제목과
            함께 어떤 경험/프로젝트를 근거로 어떻게 표현하면 좋을지 2~3문장으로 설명. 근거가 약하면
            무리해서 만들지 말고 개수를 줄이세요.)

            ## 보완이 필요해 보이는 부분
            (자격요건/우대사항 중 프로필에서 뚜렷한 근거를 찾기 어려운 항목을 짧게 나열. 없으면
            "특별히 부족한 부분은 보이지 않습니다"라고만 쓰세요.)
            """;

    private static final int EXPERIENCE_TOP_K = 8;
    private static final int STUDY_TOP_K = 5;

    private final RelevantProfileDigestService relevantProfileDigestService;
    private final LlmDispatcher llmDispatcher;

    public String analyze(
            String companyName,
            String title,
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String aiModel,
            String customModelName) {
        String queryText = JobPostingRetrievalQueryText.build(
                title, jobDescription, requiredQualifications, preferredQualifications);
        String profileDigest = relevantProfileDigestService.buildDigest(queryText, new TopK(EXPERIENCE_TOP_K, STUDY_TOP_K));
        String userPrompt =
                buildUserPrompt(
                        companyName,
                        title,
                        jobDescription,
                        requiredQualifications,
                        preferredQualifications,
                        profileDigest);
        String analysis = llmDispatcher.generate(APPEAL_PROMPT, userPrompt, aiModel, customModelName);
        // 이 모델은 이 프롬프트처럼 순수 텍스트(비-JSON)를 길게 생성할 때 종종 실제 줄바꿈 대신
        // 문자 그대로의 "\n"을 뱉는다 — JSON 모드로 학습된 습관이 새어나오는 것으로 보인다.
        // JSON 응답은 Jackson이 이스케이프를 정상적으로 풀어주지만, 이 경로는 raw 텍스트라 직접
        // 풀어줘야 마크다운 구조(문단 구분, 개별 포인트 줄바꿈)가 깨지지 않는다.
        return analysis.replace("\\n", "\n");
    }

    private String buildUserPrompt(
            String companyName,
            String title,
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String profileDigest) {
        StringBuilder sb = new StringBuilder();
        sb.append("## 지원자 프로필\n").append(profileDigest).append("\n\n");
        sb.append("## 채용 공고\n");
        sb.append("회사: ").append(companyName).append("\n");
        sb.append("직무: ").append(title).append("\n");
        appendIfPresent(sb, "담당업무", jobDescription);
        appendIfPresent(sb, "자격요건", requiredQualifications);
        appendIfPresent(sb, "우대사항", preferredQualifications);
        return sb.toString();
    }

    private void appendIfPresent(StringBuilder sb, String label, String value) {
        if (AiJsonSupport.hasText(value)) {
            sb.append(label).append(":\n").append(value).append("\n");
        }
    }
}
