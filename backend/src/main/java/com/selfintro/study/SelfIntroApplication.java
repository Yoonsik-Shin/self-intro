package com.selfintro.study;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.selfintro")
public class SelfIntroApplication {

    public static void main(String[] args) {
        SpringApplication.run(SelfIntroApplication.class, args);
    }
}
