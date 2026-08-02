package com.selfintro.modules.jobapplication.application.grpc;

import com.selfintro.grpc.jobposting.JobMatchingScoreRequest;
import com.selfintro.grpc.jobposting.JobMatchingScoreResponse;
import com.selfintro.grpc.jobposting.JobPostingGrpcServiceGrpc;
import com.selfintro.grpc.jobposting.JobPostingSummaryRequest;
import com.selfintro.grpc.jobposting.JobPostingSummaryResponse;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

@Service
public class JobPostingGrpcClient {

    @GrpcClient("jobPostingService")
    private JobPostingGrpcServiceGrpc.JobPostingGrpcServiceBlockingStub jobPostingStub;

    public JobPostingSummaryResponse getJobPostingSummary(Long id) {
        JobPostingSummaryRequest request = JobPostingSummaryRequest.newBuilder()
                .setId(id)
                .build();
        return jobPostingStub.getJobPostingSummary(request);
    }

    public JobMatchingScoreResponse getJobMatchingScore(Long jobPostingId) {
        JobMatchingScoreRequest request = JobMatchingScoreRequest.newBuilder()
                .setJobPostingId(jobPostingId)
                .build();
        return jobPostingStub.getJobMatchingScore(request);
    }
}
