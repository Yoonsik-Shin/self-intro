package com.selfintro.modules.jobapplication.application;

import com.selfintro.modules.jobposting.domain.repository.JobPostingSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.scheduling.support.CronTrigger;

/**
 * 공고 수집 스케줄의 cron 표현식을 {@code JobPostingSetting}(DB)에서 매 실행 직전마다 다시 읽어온다. 어드민 화면에서 cron을 바꾸면 재배포 없이
 * 다음 실행부터 바로 반영된다.
 */
@Configuration
@ConditionalOnProperty(
        name = "app.job-posting.scheduler-enabled",
        havingValue = "true",
        matchIfMissing = true)
@RequiredArgsConstructor
public class JobPostingSchedulingConfig implements SchedulingConfigurer {

    private final JobPostingCollectorService collectorService;
    private final JobPostingSettingRepository settingRepository;

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        taskRegistrar.addTriggerTask(
                collectorService::scheduledCollect,
                triggerContext -> {
                    String cron = settingRepository.getOrCreateDefault().getCollectorCron();
                    return new CronTrigger(cron).nextExecution(triggerContext);
                });
    }
}
