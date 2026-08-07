package com.selfintro.modules.printtemplate.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "print_template_revision")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PrintTemplateRevision {

    public static final String SENDER_USER = "USER";
    public static final String SENDER_AI = "AI";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "print_template_id", nullable = false)
    private Long printTemplateId;

    @Column(name = "sender_type", nullable = false, length = 10)
    private String senderType;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "ai_model", length = 50)
    private String aiModel;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private PrintTemplateRevision(
            Long printTemplateId,
            String senderType,
            String content,
            String aiModel,
            LocalDateTime createdAt) {
        this.printTemplateId = printTemplateId;
        this.senderType = senderType;
        this.content = content;
        this.aiModel = aiModel;
        this.createdAt = createdAt;
    }

    public static PrintTemplateRevision create(
            Long printTemplateId, String senderType, String content, LocalDateTime createdAt) {
        return new PrintTemplateRevision(printTemplateId, senderType, content, null, createdAt);
    }

    public static PrintTemplateRevision create(
            Long printTemplateId,
            String senderType,
            String content,
            String aiModel,
            LocalDateTime createdAt) {
        return new PrintTemplateRevision(printTemplateId, senderType, content, aiModel, createdAt);
    }
}
