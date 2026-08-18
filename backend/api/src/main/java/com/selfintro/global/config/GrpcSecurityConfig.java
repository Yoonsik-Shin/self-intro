package com.selfintro.global.config;

import net.devh.boot.grpc.server.security.authentication.AnonymousAuthenticationReader;
import net.devh.boot.grpc.server.security.authentication.GrpcAuthenticationReader;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnClass(GrpcAuthenticationReader.class)
public class GrpcSecurityConfig {

    @Bean
    @ConditionalOnMissingBean
    public GrpcAuthenticationReader grpcAuthenticationReader() {
        return new AnonymousAuthenticationReader("grpc-anonymous-key");
    }
}
