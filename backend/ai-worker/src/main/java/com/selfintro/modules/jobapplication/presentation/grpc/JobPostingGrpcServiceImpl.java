package com.selfintro.modules.jobapplication.presentation.grpc;

import com.selfintro.grpc.jobposting.JobMatchingScoreRequest;
import com.selfintro.grpc.jobposting.JobMatchingScoreResponse;
import com.selfintro.grpc.jobposting.JobPostingGrpcServiceGrpc;
import com.selfintro.grpc.jobposting.JobPostingSummaryRequest;
import com.selfintro.grpc.jobposting.JobPostingSummaryResponse;
import com.selfintro.modules.jobapplication.domain.entity.JobPosting;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingRepository;
import io.grpc.stub.StreamObserver;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@GrpcService
@RequiredArgsConstructor
public class JobPostingGrpcServiceImpl extends JobPostingGrpcServiceGrpc.JobPostingGrpcServiceImplBase {

    private final JobPostingRepository jobPostingRepository;

    @Override
    @Transactional(readOnly = true)
    public void getJobPostingSummary(JobPostingSummaryRequest request, StreamObserver<JobPostingSummaryResponse> responseObserver) {
        log.info("[gRPC Server] getJobPostingSummary DB 조회 요청: id={}", request.getId());

        Optional<JobPosting> postingOpt = jobPostingRepository.findById(request.getId());

        JobPostingSummaryResponse response;
        if (postingOpt.isPresent()) {
            JobPosting posting = postingOpt.get();
            response = JobPostingSummaryResponse.newBuilder()
                    .setId(posting.getId())
                    .setCompanyName(posting.getCompanyName() != null ? posting.getCompanyName() : "")
                    .setTitle(posting.getPositionTitle() != null ? posting.getPositionTitle() : "")
                    .setStatus(posting.getStatus() != null ? posting.getStatus().name() : "NEW")
                    .setApplyUrl(posting.getPostingUrl() != null ? posting.getPostingUrl() : "")
                    .setLocation(posting.getLocation() != null ? posting.getLocation() : "")
                    .setExperienceLevel(posting.getSource() != null ? posting.getSource() : "")
                    .build();
        } else {
            response = JobPostingSummaryResponse.newBuilder()
                    .setId(request.getId())
                    .setCompanyName("채용공고 #" + request.getId())
                    .setTitle("채용공고 정보를 찾을 수 없습니다")
                    .setStatus("UNKNOWN")
                    .setApplyUrl("")
                    .setLocation("")
                    .setExperienceLevel("")
                    .build();
        }

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

    @Override
    @Transactional(readOnly = true)
    public void getJobMatchingScore(JobMatchingScoreRequest request, StreamObserver<JobMatchingScoreResponse> responseObserver) {
        log.info("[gRPC Server] getJobMatchingScore DB 조회 요청: id={}", request.getJobPostingId());

        Optional<JobPosting> postingOpt = jobPostingRepository.findById(request.getJobPostingId());

        JobMatchingScoreResponse response;
        if (postingOpt.isPresent() && postingOpt.get().getMatchScore() != null) {
            JobPosting posting = postingOpt.get();
            response = JobMatchingScoreResponse.newBuilder()
                    .setJobPostingId(posting.getId())
                    .setScore(posting.getMatchScore())
                    .setEvaluationSummary(posting.getMatchReason() != null ? posting.getMatchReason() : "")
                    .setMatchedAt(posting.getUpdatedAt() != null ? posting.getUpdatedAt().toString() : LocalDateTime.now().toString())
                    .build();
        } else {
            response = JobMatchingScoreResponse.newBuilder()
                    .setJobPostingId(request.getJobPostingId())
                    .setScore(0)
                    .setEvaluationSummary("매칭 평가 데이터가 아직 없습니다.")
                    .setMatchedAt(LocalDateTime.now().toString())
                    .build();
        }

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
}
