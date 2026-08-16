package com.selfintro.modules.experiencetree.application;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.experience-tree.import-enabled", havingValue = "true")
public class ExperienceTreeImportRunner implements ApplicationRunner {
    private final ExperienceTreeImporter importer;

    @Override
    public void run(ApplicationArguments args) {
        importer.importAll();
    }
}
