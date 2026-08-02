package com.selfintro.modules.jobapplication.presentation.grpc;

import com.selfintro.grpc.jobposting.JobMatchingScoreRequest;
import com.selfintro.grpc.jobposting.JobMatchingScoreResponse;
import com.selfintro.grpc.jobposting.JobPostingGrpcServiceGrpc;
import com.selfintro.grpc.jobposting.JobPostingSummaryRequest;
import com.selfintro.grpc.jobposting.JobPostingSummaryResponse;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@GrpcService
public class JobPostingGrpcServiceImpl extends JobPostingGrpcServiceGrpc.JobPostingGrpcServiceImplBase {

    @Override
    public void getJobPostingSummary(JobPostingSummaryRequest request, StreamObserver<JobPostingSummaryResponse> responseObserver) {
        log.info("[gRPC Server] getJobPostingSummary 호출: id={}", request.getId());

        JobPostingSummaryResponse response = JobPostingSummaryResponse.newBuilder()
                .setId(request.getId())
                .setCompanyName("네이버")
                .setTitle("백엔드 엔지니어 (gRPC Internal API)")
                .setStatus("APPLIED")
                .setApplyUrl("https://naver.com")
                .setLocation("Pangyo, Korea")
                .setExperienceLevel("3-5 years")
                .build();

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

    @Override
    public void getJobMatchingScore(JobMatchingScoreRequest request, StreamObserver<JobMatchingScoreResponse> responseObserver) {
        log.info("[gRPC Server] getJobMatchingScore 호출: id={}", request.getJobPostingId());

        JobMatchingScoreResponse response = JobMatchingScoreResponse.newBuilder()
                .setJobPostingId(request.getJobPostingId())
                .setScore(95)
                .setEvaluationSummary("Spring Boot, gRPC, K8s 역량이 완벽히 일치합니다.")
                .setMatchedAt("2026-08-02T12:00:00Z")
                .build();

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
}
