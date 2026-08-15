/*
 * Self-Intro schema baseline V1.
 * Reproduced from the complete pre-baseline migration chain through V235.
 * Schema only: existing environment data is preserved separately during cutover.
 */

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `login_id` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_canonical` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` datetime(6) DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mfa_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `mfa_secret_ciphertext` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `withdrawn_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_user_login_id` (`login_id`),
  UNIQUE KEY `uk_app_user_email` (`email`),
  UNIQUE KEY `uk_app_user_email_canonical` (`email_canonical`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `architecture_layer` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `icon` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `is_visible` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `architecture_layer_item` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `layer_id` bigint NOT NULL,
  `strong_text` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body_text` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_architecture_layer_item_layer` (`layer_id`),
  CONSTRAINT `fk_architecture_layer_item_layer` FOREIGN KEY (`layer_id`) REFERENCES `architecture_layer` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `architecture_overview` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `heading` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subheading` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `diagram_heading` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `diagram_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `career` (
  `experience_id` bigint NOT NULL,
  `company_name` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `employment_type` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`experience_id`),
  CONSTRAINT `fk_career_experience` FOREIGN KEY (`experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certificate` (
  `experience_id` bigint NOT NULL,
  `issuer` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`experience_id`),
  CONSTRAINT `fk_certificate_experience` FOREIGN KEY (`experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competency` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `title` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `is_visible` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_competency_id_workspace_public_config` (`id`,`workspace_id`),
  KEY `idx_competency_workspace_display` (`workspace_id`,`display_order`),
  CONSTRAINT `fk_competency_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competency_evidence` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `competency_id` bigint NOT NULL,
  `experience_id` bigint NOT NULL,
  `evidence_summary` varchar(700) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_competency_evidence` (`competency_id`,`experience_id`),
  KEY `fk_competency_evidence_experience` (`experience_id`),
  CONSTRAINT `fk_competency_evidence_competency` FOREIGN KEY (`competency_id`) REFERENCES `competency` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_competency_evidence_experience` FOREIGN KEY (`experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competency_skill` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `competency_id` bigint NOT NULL,
  `skill_id` bigint NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_competency_skill` (`competency_id`,`skill_id`),
  KEY `fk_competency_skill_skill` (`skill_id`),
  CONSTRAINT `fk_competency_skill_competency` FOREIGN KEY (`competency_id`) REFERENCES `competency` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_competency_skill_skill` FOREIGN KEY (`skill_id`) REFERENCES `skill` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competency_study` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `competency_id` bigint NOT NULL,
  `study_id` bigint NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_competency_study` (`competency_id`,`study_id`),
  KEY `fk_competency_study_study` (`study_id`),
  CONSTRAINT `fk_competency_study_competency` FOREIGN KEY (`competency_id`) REFERENCES `competency` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_competency_study_study` FOREIGN KEY (`study_id`) REFERENCES `study` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competency_tag` (
  `competency_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  PRIMARY KEY (`competency_id`,`tag_id`),
  KEY `idx_competency_tag_tag_id` (`tag_id`),
  CONSTRAINT `fk_competency_tag_competency` FOREIGN KEY (`competency_id`) REFERENCES `competency` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_competency_tag_tag` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `decision_option` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `situation_id` bigint NOT NULL,
  `stable_key` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mechanism` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicable_when` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `avoid_when` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `advantages` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `disadvantages` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `operational_notes` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_decision_option_stable_key` (`stable_key`),
  KEY `idx_decision_option_situation` (`situation_id`,`display_order`),
  CONSTRAINT `fk_decision_option_situation` FOREIGN KEY (`situation_id`) REFERENCES `decision_situation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `decision_situation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `stable_key` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` bigint DEFAULT NULL,
  `domain` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `topic` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `problem` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `context_markdown` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `constraints_markdown` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `verification_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_version` int NOT NULL,
  `content_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `verified_at` date DEFAULT NULL,
  `next_review_at` date DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_decision_situation_stable_key` (`stable_key`),
  KEY `idx_decision_situation_domain_topic` (`domain`,`topic`,`display_order`),
  KEY `idx_decision_situation_parent` (`parent_id`),
  CONSTRAINT `fk_decision_situation_parent` FOREIGN KEY (`parent_id`) REFERENCES `decision_situation` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `decision_situation_relation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `source_situation_id` bigint NOT NULL,
  `target_situation_id` bigint NOT NULL,
  `relation_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_decision_situation_relation` (`source_situation_id`,`target_situation_id`,`relation_type`),
  KEY `fk_decision_relation_target` (`target_situation_id`),
  CONSTRAINT `fk_decision_relation_source` FOREIGN KEY (`source_situation_id`) REFERENCES `decision_situation` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_decision_relation_target` FOREIGN KEY (`target_situation_id`) REFERENCES `decision_situation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `decision_source` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `situation_id` bigint NOT NULL,
  `option_id` bigint DEFAULT NULL,
  `warning_id` bigint DEFAULT NULL,
  `source_type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `publisher` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicable_version` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accessed_at` date NOT NULL,
  `note` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_decision_source_situation` (`situation_id`,`display_order`),
  KEY `fk_decision_source_option` (`option_id`),
  KEY `fk_decision_source_warning` (`warning_id`),
  CONSTRAINT `fk_decision_source_option` FOREIGN KEY (`option_id`) REFERENCES `decision_option` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_decision_source_situation` FOREIGN KEY (`situation_id`) REFERENCES `decision_situation` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_decision_source_warning` FOREIGN KEY (`warning_id`) REFERENCES `decision_warning` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `decision_study_link` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `situation_id` bigint NOT NULL,
  `option_id` bigint DEFAULT NULL,
  `option_scope_key` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `study_id` bigint NOT NULL,
  `relation_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `display_order` int NOT NULL DEFAULT '0',
  `managed_by_catalog` tinyint(1) NOT NULL DEFAULT '0',
  `seed_key` varchar(180) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_decision_study_link_workspace` (`workspace_id`,`situation_id`,`option_scope_key`,`study_id`,`relation_type`),
  UNIQUE KEY `uk_decision_study_link_workspace_seed` (`workspace_id`,`seed_key`),
  KEY `idx_decision_study_link_study` (`study_id`),
  KEY `fk_decision_study_link_option_set_null` (`option_id`),
  KEY `idx_decision_study_link_situation` (`situation_id`),
  KEY `idx_decision_study_link_workspace_situation` (`workspace_id`,`situation_id`,`display_order`),
  KEY `fk_decision_study_link_study_workspace` (`study_id`,`workspace_id`),
  CONSTRAINT `fk_decision_study_link_option_set_null` FOREIGN KEY (`option_id`) REFERENCES `decision_option` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_decision_study_link_situation` FOREIGN KEY (`situation_id`) REFERENCES `decision_situation` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_decision_study_link_study_workspace` FOREIGN KEY (`study_id`, `workspace_id`) REFERENCES `study` (`id`, `workspace_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_decision_study_link_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `decision_tradeoff` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `option_id` bigint NOT NULL,
  `criterion` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `explanation` varchar(1200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_decision_tradeoff_option_criterion` (`option_id`,`criterion`),
  CONSTRAINT `fk_decision_tradeoff_option` FOREIGN KEY (`option_id`) REFERENCES `decision_option` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `decision_warning` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `situation_id` bigint NOT NULL,
  `option_id` bigint DEFAULT NULL,
  `stable_key` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `classification` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `failure_condition` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `consequence` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `correction` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_decision_warning_stable_key` (`stable_key`),
  KEY `idx_decision_warning_situation` (`situation_id`,`display_order`),
  KEY `fk_decision_warning_option` (`option_id`),
  CONSTRAINT `fk_decision_warning_option` FOREIGN KEY (`option_id`) REFERENCES `decision_option` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_decision_warning_situation` FOREIGN KEY (`situation_id`) REFERENCES `decision_situation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `client_token` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int NOT NULL,
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'KRW',
  `message` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mul_no` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pay_state` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_subscription` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL,
  `paid_at` datetime(6) DEFAULT NULL,
  `provider_paid_at` datetime(6) DEFAULT NULL,
  `canceled_at` datetime(6) DEFAULT NULL,
  `version` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_donation_client_token` (`client_token`),
  UNIQUE KEY `uk_donation_mul_no` (`mul_no`),
  KEY `idx_donation_status_created` (`status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donation_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `donation_id` bigint NOT NULL,
  `event_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pay_state` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detail` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_donation_event_donation` (`donation_id`),
  CONSTRAINT `fk_donation_event_donation` FOREIGN KEY (`donation_id`) REFERENCES `donation` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donation_setting` (
  `id` bigint NOT NULL,
  `donation_enabled` tinyint(1) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `education` (
  `experience_id` bigint NOT NULL,
  `institution_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `education_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACADEMIC' COMMENT '학력/학습 구분: ACADEMIC (정규 학력), COURSE (교육과정/학습)',
  `degree` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '학력 구분 / 학위 (고등학교, 전문학사, 학사, 석사, 박사 등)',
  `major` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '전공 또는 계열 (예: 컴퓨터공학, 이과계열)',
  `gpa` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '학점 (예: 3.8 / 4.5)',
  `graduation_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '졸업 상태 (GRADUATED, ATTENDING, COMPLETED, DROPPED_OUT, ON_LEAVE)',
  PRIMARY KEY (`experience_id`),
  CONSTRAINT `fk_education_experience` FOREIGN KEY (`experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_change_token` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `new_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `new_email_canonical` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` binary(32) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `used_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email_change_token_hash` (`token_hash`),
  KEY `idx_email_change_token_user` (`user_id`),
  KEY `idx_email_change_token_retention` (`expires_at`,`used_at`),
  CONSTRAINT `fk_email_change_token_user` FOREIGN KEY (`user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_verification_token` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token_hash` binary(32) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `used_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email_verification_token_hash` (`token_hash`),
  KEY `idx_email_verification_user_created` (`user_id`,`created_at`),
  CONSTRAINT `fk_email_verification_user` FOREIGN KEY (`user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `experience` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `type` varchar(31) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date DEFAULT NULL,
  `summary` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `takeaway` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `show_on_timeline` tinyint(1) NOT NULL DEFAULT '1',
  `timeline_label` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_experience_id_workspace_public_config` (`id`,`workspace_id`),
  KEY `idx_experience_workspace_display` (`workspace_id`,`display_order`),
  CONSTRAINT `fk_experience_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `experience_detail` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `experience_id` bigint DEFAULT NULL,
  `content` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `situation` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `task` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `action_detail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `outcome` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `narrative` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `visible` tinyint(1) NOT NULL DEFAULT '1',
  `public_visible` tinyint(1) NOT NULL DEFAULT '1',
  `resume_available` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_experience_detail_id_experience` (`id`,`experience_id`),
  KEY `fk_exp_detail_experience` (`experience_id`),
  CONSTRAINT `fk_exp_detail_experience` FOREIGN KEY (`experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `experience_detail_skill` (
  `experience_detail_id` bigint NOT NULL,
  `skill_id` bigint NOT NULL,
  `list_order` int NOT NULL,
  PRIMARY KEY (`experience_detail_id`,`list_order`),
  KEY `fk_exp_detail_skill_skill` (`skill_id`),
  CONSTRAINT `fk_exp_detail_skill_detail` FOREIGN KEY (`experience_detail_id`) REFERENCES `experience_detail` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exp_detail_skill_skill` FOREIGN KEY (`skill_id`) REFERENCES `skill` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `experience_image` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `experience_id` bigint DEFAULT NULL,
  `object_key` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_experience_image_experience_id` (`experience_id`),
  CONSTRAINT `fk_experience_image_experience` FOREIGN KEY (`experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `experience_placement` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `experience_id` bigint NOT NULL,
  `placement_type` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_experience_placement` (`experience_id`,`placement_type`),
  UNIQUE KEY `uk_experience_placement_id_experience` (`id`,`experience_id`),
  KEY `idx_experience_placement_public` (`placement_type`,`enabled`,`display_order`),
  CONSTRAINT `fk_experience_placement_experience` FOREIGN KEY (`experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `experience_placement_detail` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `placement_id` bigint NOT NULL,
  `experience_id` bigint NOT NULL,
  `experience_detail_id` bigint NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_experience_placement_detail` (`placement_id`,`experience_detail_id`),
  KEY `fk_placement_detail_experience_detail` (`experience_detail_id`),
  KEY `idx_placement_detail_order` (`placement_id`,`display_order`),
  KEY `idx_placement_detail_placement_experience` (`placement_id`,`experience_id`),
  KEY `idx_placement_detail_detail_experience` (`experience_detail_id`,`experience_id`),
  CONSTRAINT `fk_placement_detail_detail_experience` FOREIGN KEY (`experience_detail_id`, `experience_id`) REFERENCES `experience_detail` (`id`, `experience_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_placement_detail_placement_experience` FOREIGN KEY (`placement_id`, `experience_id`) REFERENCES `experience_placement` (`id`, `experience_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `experience_relation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `source_experience_id` bigint NOT NULL,
  `target_experience_id` bigint NOT NULL,
  `relation_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_experience_relation` (`source_experience_id`,`target_experience_id`,`relation_type`),
  KEY `idx_experience_relation_target` (`target_experience_id`),
  CONSTRAINT `fk_experience_relation_source` FOREIGN KEY (`source_experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_experience_relation_target` FOREIGN KEY (`target_experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_experience_relation_not_self` CHECK ((`source_experience_id` <> `target_experience_id`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `experience_skill` (
  `experience_id` bigint NOT NULL,
  `skill_id` bigint NOT NULL,
  `list_order` int NOT NULL,
  PRIMARY KEY (`experience_id`,`list_order`),
  KEY `fk_exp_skill_skill` (`skill_id`),
  CONSTRAINT `fk_exp_skill_experience` FOREIGN KEY (`experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exp_skill_skill` FOREIGN KEY (`skill_id`) REFERENCES `skill` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `experience_tag` (
  `experience_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  PRIMARY KEY (`experience_id`,`tag_id`),
  KEY `fk_experience_tag_tag` (`tag_id`),
  CONSTRAINT `fk_experience_tag_experience` FOREIGN KEY (`experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_experience_tag_tag` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gap_project_document` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_job_application_id` bigint NOT NULL,
  `job_posting_id` bigint NOT NULL,
  `version` int NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_appeal_analyzed_at` datetime(6) DEFAULT NULL,
  `gap_snapshot` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_json` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `rendered_markdown` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_gap_project_document_application_version` (`workspace_job_application_id`,`version`),
  KEY `idx_gap_project_document_job_posting` (`job_posting_id`,`version` DESC),
  KEY `idx_gap_project_document_posting_shadow` (`job_posting_id`),
  KEY `idx_gap_project_document_application` (`workspace_job_application_id`,`version` DESC),
  CONSTRAINT `fk_gap_project_document_job_posting` FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gap_project_document_workspace_application` FOREIGN KEY (`workspace_job_application_id`) REFERENCES `workspace_job_application` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_posting` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `owner_workspace_id` bigint DEFAULT NULL,
  `scope_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PLATFORM',
  `company_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_name_normalized` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position_title` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `position_title_normalized` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `posting_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collection_method` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `source` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied_at` date DEFAULT NULL,
  `deadline` date DEFAULT NULL,
  `deadline_time` time DEFAULT '23:59:59',
  `is_always_open` tinyint(1) NOT NULL DEFAULT '0',
  `salary_note` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employment_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `memo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `required_skills_raw` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `job_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `required_qualifications` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `preferred_qualifications` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `hiring_process` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `application_method` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `compensation_detail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `match_score` int DEFAULT NULL,
  `match_reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `appeal_analysis` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `appeal_analyzed_at` datetime(6) DEFAULT NULL,
  `jobplanet_rating` decimal(2,1) DEFAULT NULL,
  `jobplanet_review_count` int DEFAULT NULL,
  `jobplanet_company_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jobplanet_company_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jobplanet_checked_at` datetime(6) DEFAULT NULL,
  `status_changed_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `permission_basis` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNKNOWN',
  `permission_review_status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'REVIEW_REQUIRED',
  `permission_evidence_reference` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permission_grantor_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permission_grantor_authority` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permission_scope_note` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permission_terms_version` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permission_revocation_contact` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permission_expires_at` datetime(6) DEFAULT NULL,
  `permission_reviewed_by_user_id` bigint DEFAULT NULL,
  `permission_reviewed_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_job_posting_scope_url` (`scope_key`,`posting_url`),
  KEY `idx_job_posting_status` (`status`),
  KEY `idx_job_posting_applied_at` (`applied_at`),
  KEY `idx_job_posting_status_changed` (`status_changed_at`),
  KEY `idx_job_posting_status_deadline` (`status`,`deadline`),
  KEY `idx_job_posting_normalized_match` (`company_name_normalized`,`position_title_normalized`),
  KEY `idx_job_posting_permission_catalog` (`permission_review_status`,`permission_expires_at`),
  KEY `idx_job_posting_owner_workspace` (`owner_workspace_id`,`updated_at`),
  CONSTRAINT `fk_job_posting_owner_workspace` FOREIGN KEY (`owner_workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_posting_cover_letter_item` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_job_application_id` bigint NOT NULL,
  `job_posting_id` bigint NOT NULL,
  `question` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `answer` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `character_limit` int DEFAULT NULL,
  `display_order` int NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cover_letter_item_application_order` (`workspace_job_application_id`,`display_order`),
  KEY `idx_cover_letter_item_posting_shadow` (`job_posting_id`),
  KEY `idx_cover_letter_item_application` (`workspace_job_application_id`),
  CONSTRAINT `fk_cover_letter_item_job_posting` FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cover_letter_item_workspace_application` FOREIGN KEY (`workspace_job_application_id`) REFERENCES `workspace_job_application` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_posting_cover_letter_revision` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `cover_letter_item_id` bigint NOT NULL,
  `sender_type` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `ai_model` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '초안 작성에 사용된 AI 모델명',
  PRIMARY KEY (`id`),
  KEY `idx_jp_cl_revision_item_id` (`cover_letter_item_id`),
  CONSTRAINT `fk_cover_letter_revision_item` FOREIGN KEY (`cover_letter_item_id`) REFERENCES `job_posting_cover_letter_item` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_posting_permission_review_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_posting_id` bigint NOT NULL,
  `review_status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_basis` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `evidence_reference` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grantor_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grantor_authority` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permission_scope_note` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `terms_version` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revocation_contact` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `reviewed_by_user_id` bigint NOT NULL,
  `reviewed_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_job_permission_event_posting_time` (`job_posting_id`,`reviewed_at`),
  CONSTRAINT `fk_job_permission_event_posting` FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_posting_position_choice` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_posting_id` bigint NOT NULL,
  `rank_order` int NOT NULL,
  `position_title` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_job_posting_position_choice_rank` (`job_posting_id`,`rank_order`),
  CONSTRAINT `fk_job_posting_position_choice_posting` FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_posting_setting` (
  `id` bigint NOT NULL,
  `saramin_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `search_keywords` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `search_count` int NOT NULL DEFAULT '20',
  `search_sort` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pd',
  `location_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industry_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collector_scheduled_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `matching_keyword_threshold` int NOT NULL DEFAULT '0',
  `collector_cron` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0 0 8 * * *',
  `updated_at` datetime(6) NOT NULL,
  `home_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `home_latitude` decimal(10,7) DEFAULT NULL,
  `home_longitude` decimal(10,7) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_posting_source_image` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_posting_id` bigint NOT NULL,
  `object_key` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_job_posting_source_image_posting` (`job_posting_id`,`display_order`),
  CONSTRAINT `fk_job_posting_source_image_posting` FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_posting_source_url` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_posting_id` bigint NOT NULL,
  `scope_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PLATFORM',
  `url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_job_posting_source_scope_url` (`scope_key`,`url`),
  KEY `idx_job_posting_source_url_posting` (`job_posting_id`,`is_primary` DESC,`created_at`),
  CONSTRAINT `fk_job_posting_source_url_posting` FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_posting_status_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_posting_id` bigint NOT NULL,
  `status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `memo` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_job_posting_status_event_posting` (`job_posting_id`),
  KEY `idx_job_posting_status_event_posting_changed` (`job_posting_id`,`changed_at`),
  CONSTRAINT `fk_job_posting_status_event_posting` FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `learning_resource` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `slug` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `instructor_or_author` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WISHLIST',
  `priority_tier` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `summary` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detail_markdown` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_learning_resource_slug` (`slug`),
  KEY `idx_learning_resource_status` (`status`),
  KEY `idx_learning_resource_priority_order` (`priority_tier`,`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `learning_resource_relation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `source_resource_id` bigint NOT NULL,
  `target_resource_id` bigint NOT NULL,
  `relation_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_learning_resource_relation` (`source_resource_id`,`target_resource_id`,`relation_type`),
  KEY `fk_learning_resource_relation_target` (`target_resource_id`),
  CONSTRAINT `fk_learning_resource_relation_source` FOREIGN KEY (`source_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_learning_resource_relation_target` FOREIGN KEY (`target_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `learning_resource_skill` (
  `learning_resource_id` bigint NOT NULL,
  `skill_id` bigint NOT NULL,
  PRIMARY KEY (`learning_resource_id`,`skill_id`),
  KEY `fk_learning_resource_skill_skill` (`skill_id`),
  CONSTRAINT `fk_learning_resource_skill_resource` FOREIGN KEY (`learning_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_learning_resource_skill_skill` FOREIGN KEY (`skill_id`) REFERENCES `skill` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `learning_resource_tag` (
  `learning_resource_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  PRIMARY KEY (`learning_resource_id`,`tag_id`),
  KEY `fk_learning_resource_tag_tag` (`tag_id`),
  CONSTRAINT `fk_learning_resource_tag_resource` FOREIGN KEY (`learning_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_learning_resource_tag_tag` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `learning_resource_taxonomy_node` (
  `learning_resource_id` bigint NOT NULL,
  `taxonomy_node_id` bigint NOT NULL,
  PRIMARY KEY (`learning_resource_id`,`taxonomy_node_id`),
  KEY `idx_lr_taxonomy_node_node` (`taxonomy_node_id`),
  CONSTRAINT `fk_lr_taxonomy_node_node` FOREIGN KEY (`taxonomy_node_id`) REFERENCES `taxonomy_node` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lr_taxonomy_node_resource` FOREIGN KEY (`learning_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mfa_recovery_code` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `code_hash` binary(32) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `consumed_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mfa_recovery_code_user_hash` (`user_id`,`code_hash`),
  KEY `idx_mfa_recovery_code_user_active` (`user_id`,`consumed_at`),
  CONSTRAINT `fk_mfa_recovery_code_user` FOREIGN KEY (`user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_token` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token_hash` binary(32) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `used_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_password_reset_token_hash` (`token_hash`),
  KEY `idx_password_reset_token_user` (`user_id`),
  KEY `idx_password_reset_token_retention` (`expires_at`,`used_at`),
  CONSTRAINT `fk_password_reset_token_user` FOREIGN KEY (`user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `portfolio_case_study` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `experience_id` bigint NOT NULL,
  `slug` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `published_revision_id` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_portfolio_case_study_workspace_slug` (`workspace_id`,`slug`),
  UNIQUE KEY `uk_portfolio_case_id_workspace_public_config` (`id`,`workspace_id`),
  KEY `idx_portfolio_case_study_experience` (`experience_id`),
  KEY `fk_portfolio_case_study_published_revision` (`published_revision_id`),
  KEY `idx_portfolio_case_study_workspace_updated` (`workspace_id`,`updated_at`),
  CONSTRAINT `fk_portfolio_case_study_experience` FOREIGN KEY (`experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_portfolio_case_study_published_revision` FOREIGN KEY (`published_revision_id`) REFERENCES `portfolio_case_study_revision` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_portfolio_case_study_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `portfolio_case_study_revision` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `case_study_id` bigint NOT NULL,
  `version` int NOT NULL,
  `source` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_json` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `rendered_markdown` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_portfolio_case_study_revision_version` (`case_study_id`,`version`),
  CONSTRAINT `fk_portfolio_case_study_revision_case_study` FOREIGN KEY (`case_study_id`) REFERENCES `portfolio_case_study` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `print_document_artifact` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `print_template_id` bigint NOT NULL,
  `print_template_revision_id` bigint NOT NULL,
  `job_posting_id` bigint DEFAULT NULL,
  `object_key` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sha256_checksum` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_length` bigint NOT NULL,
  `content_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `origin` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `renderer_version` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `font_bundle_version` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `page_count` int DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `generated_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_print_document_artifact_object_key` (`object_key`),
  KEY `idx_print_document_artifact_workspace_template` (`workspace_id`,`print_template_id`,`id`),
  KEY `idx_print_document_artifact_revision` (`print_template_revision_id`),
  KEY `idx_print_document_artifact_job_posting` (`workspace_id`,`job_posting_id`),
  KEY `fk_print_document_artifact_template` (`print_template_id`),
  CONSTRAINT `fk_print_document_artifact_revision` FOREIGN KEY (`print_template_revision_id`) REFERENCES `print_template_revision` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_print_document_artifact_template` FOREIGN KEY (`print_template_id`) REFERENCES `print_template` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_print_document_artifact_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_print_document_artifact_content_length` CHECK ((`content_length` > 0)),
  CONSTRAINT `chk_print_document_artifact_origin` CHECK ((`origin` in (_utf8mb4'BROWSER_UPLOAD',_utf8mb4'EXTERNAL_UPLOAD'))),
  CONSTRAINT `chk_print_document_artifact_page_count` CHECK (((`page_count` is null) or (`page_count` > 0))),
  CONSTRAINT `chk_print_document_artifact_status` CHECK ((`status` = _utf8mb4'READY'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `print_template` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `excluded_ids` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `section_order` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `section_gaps` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_role` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GENERAL',
  `content_overrides` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_content_fingerprint` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `schema_version` int NOT NULL DEFAULT '2',
  `source` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MANUAL',
  `generation_metadata` longtext COLLATE utf8mb4_unicode_ci,
  `generated_at` datetime(6) DEFAULT NULL,
  `visible` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `job_posting_id` bigint DEFAULT NULL,
  `is_final_submission` tinyint(1) NOT NULL DEFAULT '0',
  `final_pdf_object_key` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `document_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RESUME',
  `portfolio_case_study_id` bigint DEFAULT NULL,
  `orientation` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PORTRAIT',
  `line_height` decimal(4,3) NOT NULL DEFAULT '1.625' COMMENT '본문 줄간격 배수',
  PRIMARY KEY (`id`),
  KEY `idx_print_template_job_posting` (`job_posting_id`),
  KEY `idx_print_template_portfolio_case_study` (`portfolio_case_study_id`,`orientation`),
  KEY `idx_print_template_workspace_document_order` (`workspace_id`,`document_type`,`display_order`),
  KEY `idx_print_template_workspace_job_posting` (`workspace_id`,`job_posting_id`,`display_order`),
  CONSTRAINT `fk_print_template_job_posting` FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_print_template_portfolio_case_study` FOREIGN KEY (`portfolio_case_study_id`) REFERENCES `portfolio_case_study` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_print_template_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `print_template_revision` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `print_template_id` bigint NOT NULL,
  `sender_type` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `ai_model` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_print_template_revision_template_id` (`print_template_id`),
  CONSTRAINT `fk_print_template_revision_template` FOREIGN KEY (`print_template_id`) REFERENCES `print_template` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profile` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `name` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_title` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bio` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `core_stack_summary` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_badge_text` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `github_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `public_email` tinyint(1) NOT NULL DEFAULT '0',
  `phone` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `public_phone` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_profile_workspace` (`workspace_id`),
  CONSTRAINT `fk_profile_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project` (
  `experience_id` bigint NOT NULL,
  `career_experience_id` bigint DEFAULT NULL,
  `slug` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contribution_rate` int DEFAULT NULL,
  `repository_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`experience_id`),
  KEY `idx_project_career` (`career_experience_id`),
  CONSTRAINT `fk_project_career` FOREIGN KEY (`career_experience_id`) REFERENCES `career` (`experience_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_project_experience` FOREIGN KEY (`experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration_invitation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code_hash` binary(32) NOT NULL,
  `label` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipient_email_canonical` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime(6) NOT NULL,
  `max_uses` int NOT NULL,
  `used_count` int NOT NULL DEFAULT '0',
  `sent_count` int NOT NULL DEFAULT '0',
  `last_sent_at` datetime(6) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `revoked_at` datetime(6) DEFAULT NULL,
  `used_at` datetime(6) DEFAULT NULL,
  `created_by_user_id` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_registration_invitation_code_hash` (`code_hash`),
  KEY `fk_registration_invitation_creator` (`created_by_user_id`),
  KEY `idx_registration_invitation_created_at` (`created_at`),
  KEY `idx_registration_invitation_recipient` (`recipient_email_canonical`),
  KEY `idx_registration_invitation_retention` (`status`,`expires_at`,`used_at`,`revoked_at`),
  CONSTRAINT `fk_registration_invitation_creator` FOREIGN KEY (`created_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_audit_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_type` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_user_id` bigint DEFAULT NULL,
  `workspace_id` bigint DEFAULT NULL,
  `target_type` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason_code` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_hash` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_security_audit_actor_created` (`actor_user_id`,`created_at`),
  KEY `idx_security_audit_workspace_created` (`workspace_id`,`created_at`),
  KEY `idx_security_audit_type_created` (`event_type`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skill` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `skill_level` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_core` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `skill_version` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skill_comment` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usage_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LEARNING',
  `badge_key` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `badge_color` varchar(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `study` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `slug` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_markdown` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `section` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ETC',
  `learned_at` date NOT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_study_workspace_slug` (`workspace_id`,`slug`),
  UNIQUE KEY `uk_study_id_workspace` (`id`,`workspace_id`),
  KEY `idx_study_status_learned_at` (`status`,`learned_at`),
  KEY `idx_study_section_status_learned_at` (`section`,`status`,`learned_at`),
  KEY `idx_study_workspace_status_learned` (`workspace_id`,`status`,`learned_at`),
  CONSTRAINT `fk_study_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `study_experience` (
  `study_id` bigint NOT NULL,
  `experience_id` bigint NOT NULL,
  PRIMARY KEY (`study_id`,`experience_id`),
  KEY `fk_study_experience_experience` (`experience_id`),
  CONSTRAINT `fk_study_experience_experience` FOREIGN KEY (`experience_id`) REFERENCES `experience` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_study_experience_study` FOREIGN KEY (`study_id`) REFERENCES `study` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `study_experience_detail` (
  `study_id` bigint NOT NULL,
  `experience_detail_id` bigint NOT NULL,
  PRIMARY KEY (`study_id`,`experience_detail_id`),
  KEY `fk_study_experience_detail_detail` (`experience_detail_id`),
  CONSTRAINT `fk_study_experience_detail_detail` FOREIGN KEY (`experience_detail_id`) REFERENCES `experience_detail` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_study_experience_detail_study` FOREIGN KEY (`study_id`) REFERENCES `study` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `study_image` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `study_id` bigint DEFAULT NULL,
  `object_key` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_study_image_study_id` (`study_id`),
  CONSTRAINT `fk_study_image_study` FOREIGN KEY (`study_id`) REFERENCES `study` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `study_relation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `source_study_id` bigint NOT NULL,
  `target_study_id` bigint NOT NULL,
  `relation_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_study_relation` (`source_study_id`,`target_study_id`,`relation_type`),
  KEY `fk_study_relation_target` (`target_study_id`),
  CONSTRAINT `fk_study_relation_source` FOREIGN KEY (`source_study_id`) REFERENCES `study` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_study_relation_target` FOREIGN KEY (`target_study_id`) REFERENCES `study` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `study_skill` (
  `study_id` bigint NOT NULL,
  `skill_id` bigint NOT NULL,
  PRIMARY KEY (`study_id`,`skill_id`),
  KEY `fk_study_skill_skill` (`skill_id`),
  CONSTRAINT `fk_study_skill_skill` FOREIGN KEY (`skill_id`) REFERENCES `skill` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_study_skill_study` FOREIGN KEY (`study_id`) REFERENCES `study` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `study_tag` (
  `study_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  PRIMARY KEY (`study_id`,`tag_id`),
  KEY `fk_study_tag_tag` (`tag_id`),
  CONSTRAINT `fk_study_tag_study` FOREIGN KEY (`study_id`) REFERENCES `study` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_study_tag_tag` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `study_taxonomy_curation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `taxonomy_node_id` bigint NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_study_taxonomy_curation_workspace_node` (`workspace_id`,`taxonomy_node_id`),
  KEY `idx_study_taxonomy_curation_node_fk` (`taxonomy_node_id`),
  KEY `idx_study_taxonomy_curation_workspace_order` (`workspace_id`,`display_order`),
  CONSTRAINT `fk_study_taxonomy_curation_node` FOREIGN KEY (`taxonomy_node_id`) REFERENCES `taxonomy_node` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_study_taxonomy_curation_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `study_taxonomy_node` (
  `study_id` bigint NOT NULL,
  `taxonomy_node_id` bigint NOT NULL,
  PRIMARY KEY (`study_id`,`taxonomy_node_id`),
  KEY `idx_study_taxonomy_node_node` (`taxonomy_node_id`),
  CONSTRAINT `fk_study_taxonomy_node_node` FOREIGN KEY (`taxonomy_node_id`) REFERENCES `taxonomy_node` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_study_taxonomy_node_study` FOREIGN KEY (`study_id`) REFERENCES `study` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_access_request` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `operator_user_id` bigint NOT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_duration_minutes` int NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_at` datetime(6) NOT NULL,
  `request_expires_at` datetime(6) NOT NULL,
  `approved_at` datetime(6) DEFAULT NULL,
  `approved_by_user_id` bigint DEFAULT NULL,
  `access_expires_at` datetime(6) DEFAULT NULL,
  `denied_at` datetime(6) DEFAULT NULL,
  `denied_by_user_id` bigint DEFAULT NULL,
  `revoked_at` datetime(6) DEFAULT NULL,
  `revoked_by_user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_support_access_workspace_status` (`workspace_id`,`status`,`requested_at`),
  KEY `idx_support_access_operator_status` (`operator_user_id`,`status`,`requested_at`),
  KEY `fk_support_access_approved_by` (`approved_by_user_id`),
  KEY `fk_support_access_denied_by` (`denied_by_user_id`),
  KEY `fk_support_access_revoked_by` (`revoked_by_user_id`),
  CONSTRAINT `fk_support_access_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_support_access_denied_by` FOREIGN KEY (`denied_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_support_access_operator` FOREIGN KEY (`operator_user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_support_access_revoked_by` FOREIGN KEY (`revoked_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_support_access_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_support_access_duration` CHECK ((`requested_duration_minutes` between 15 and 60)),
  CONSTRAINT `chk_support_access_status` CHECK ((`status` in (_utf8mb4'PENDING',_utf8mb4'APPROVED',_utf8mb4'DENIED',_utf8mb4'REVOKED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_access_request_scope` (
  `request_id` bigint NOT NULL,
  `scope` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`request_id`,`scope`),
  CONSTRAINT `fk_support_access_scope_request` FOREIGN KEY (`request_id`) REFERENCES `support_access_request` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_support_access_scope` CHECK ((`scope` in (_utf8mb4'PROFILE_READ',_utf8mb4'EXPERIENCE_READ',_utf8mb4'STUDY_READ')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tag` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `name` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tag_workspace_name` (`workspace_id`,`name`),
  UNIQUE KEY `uk_tag_workspace_slug` (`workspace_id`,`slug`),
  KEY `idx_tag_workspace_name` (`workspace_id`,`name`),
  CONSTRAINT `fk_tag_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `taxonomy_node` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `scheme_id` bigint NOT NULL,
  `name` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stable_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `display_order` int NOT NULL DEFAULT '0',
  `parent_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_taxonomy_node_scheme_slug` (`scheme_id`,`slug`),
  UNIQUE KEY `uk_taxonomy_node_scheme_stable_key` (`scheme_id`,`stable_key`),
  KEY `idx_taxonomy_node_parent` (`parent_id`),
  KEY `idx_taxonomy_node_scheme_order` (`scheme_id`,`display_order`,`id`),
  CONSTRAINT `fk_taxonomy_node_parent` FOREIGN KEY (`parent_id`) REFERENCES `taxonomy_node` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_taxonomy_node_scheme` FOREIGN KEY (`scheme_id`) REFERENCES `taxonomy_scheme` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `taxonomy_scheme` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `scope_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workspace_id` bigint DEFAULT NULL,
  `family_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_taxonomy_scheme_scope_family_version` (`scope_key`,`family_key`,`version`),
  KEY `idx_taxonomy_scheme_workspace_status` (`workspace_id`,`status`),
  KEY `idx_taxonomy_scheme_catalog` (`scope_type`,`status`,`family_key`,`version`),
  CONSTRAINT `fk_taxonomy_scheme_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_taxonomy_scheme_scope` CHECK ((((`scope_type` = _utf8mb4'PLATFORM') and (`workspace_id` is null) and (`scope_key` = _utf8mb4'PLATFORM')) or ((`scope_type` = _utf8mb4'WORKSPACE') and (`workspace_id` is not null)))),
  CONSTRAINT `ck_taxonomy_scheme_version` CHECK ((`version` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_consent` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `consent_type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `policy_version` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `granted` tinyint(1) NOT NULL,
  `recorded_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_consent_version` (`user_id`,`consent_type`,`policy_version`),
  CONSTRAINT `fk_user_consent_user` FOREIGN KEY (`user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_platform_role` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `platform_role` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_platform_role_user_role` (`user_id`,`platform_role`),
  CONSTRAINT `fk_user_platform_role_user` FOREIGN KEY (`user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `verified_identity` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `provider` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_subject_hash` binary(32) NOT NULL,
  `verification_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `verified_at` datetime(6) DEFAULT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_verified_identity_user` (`user_id`),
  UNIQUE KEY `uk_verified_identity_provider_subject` (`provider`,`provider_subject_hash`),
  CONSTRAINT `fk_verified_identity_user` FOREIGN KEY (`user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visitor_daily_visit` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `visitor_hash` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `visited_date` date NOT NULL,
  `first_visited_at` datetime(6) NOT NULL,
  `last_visited_at` datetime(6) NOT NULL,
  `page_views` bigint NOT NULL DEFAULT '1',
  `user_agent` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_bot` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_visitor_daily_visit_hash_date` (`visitor_hash`,`visited_date`),
  KEY `idx_visitor_daily_visit_date` (`visited_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visitor_hourly_visit` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `visitor_hash` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `visited_date` date NOT NULL,
  `visited_hour` int NOT NULL,
  `page_views` bigint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_visitor_hourly_visit_hash_date_hour` (`visitor_hash`,`visited_date`,`visited_hour`),
  KEY `idx_visitor_hourly_visit_date` (`visited_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `public_key` binary(16) NOT NULL,
  `name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `workspace_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `publication_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PRIVATE',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `deletion_requested_by_user_id` bigint DEFAULT NULL,
  `purge_after` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_slug` (`slug`),
  UNIQUE KEY `uk_workspace_public_key` (`public_key`),
  KEY `idx_workspace_lifecycle_purge` (`status`,`purge_after`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_job_application` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `job_posting_id` bigint NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SAVED',
  `applied_at` date DEFAULT NULL,
  `memo` text COLLATE utf8mb4_unicode_ci,
  `interest_level` tinyint DEFAULT NULL,
  `match_score` int DEFAULT NULL,
  `match_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `appeal_analysis` text COLLATE utf8mb4_unicode_ci,
  `appeal_analyzed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `status_changed_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_job_application_posting` (`workspace_id`,`job_posting_id`),
  KEY `idx_workspace_job_application_status` (`workspace_id`,`status`,`status_changed_at`),
  KEY `fk_workspace_job_application_catalog` (`job_posting_id`),
  CONSTRAINT `fk_workspace_job_application_catalog` FOREIGN KEY (`job_posting_id`) REFERENCES `job_posting` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_workspace_job_application_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_workspace_job_application_interest` CHECK (((`interest_level` is null) or (`interest_level` between 1 and 5)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_job_application_status_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_job_application_id` bigint NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `memo` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_workspace_job_application_event_application` (`workspace_job_application_id`,`changed_at`),
  CONSTRAINT `fk_workspace_job_application_event_application` FOREIGN KEY (`workspace_job_application_id`) REFERENCES `workspace_job_application` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_job_map_setting` (
  `workspace_id` bigint NOT NULL,
  `home_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `home_latitude` decimal(10,7) DEFAULT NULL,
  `home_longitude` decimal(10,7) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`workspace_id`),
  CONSTRAINT `fk_workspace_job_map_setting_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_job_screenshot_upload` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workspace_id` bigint NOT NULL,
  `object_key` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_job_screenshot_object_key` (`object_key`),
  KEY `idx_workspace_job_screenshot_expiry` (`status`,`expires_at`),
  KEY `idx_workspace_job_screenshot_workspace` (`workspace_id`,`created_at`),
  CONSTRAINT `fk_workspace_job_screenshot_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_learning_resource` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `learning_resource_id` bigint NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WISHLIST',
  `priority_tier` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `personal_summary` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `personal_note_markdown` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_learning_resource_catalog` (`workspace_id`,`learning_resource_id`),
  KEY `idx_workspace_learning_resource_workspace_order` (`workspace_id`,`display_order`,`id`),
  KEY `idx_workspace_learning_resource_workspace_status` (`workspace_id`,`status`,`priority_tier`),
  KEY `fk_workspace_learning_resource_catalog` (`learning_resource_id`),
  CONSTRAINT `fk_workspace_learning_resource_catalog` FOREIGN KEY (`learning_resource_id`) REFERENCES `learning_resource` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_workspace_learning_resource_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_learning_resource_tag` (
  `workspace_learning_resource_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  PRIMARY KEY (`workspace_learning_resource_id`,`tag_id`),
  KEY `idx_workspace_learning_resource_tag_tag` (`tag_id`),
  CONSTRAINT `fk_workspace_learning_resource_tag_overlay` FOREIGN KEY (`workspace_learning_resource_id`) REFERENCES `workspace_learning_resource` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_workspace_learning_resource_tag_tag` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_member` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `workspace_role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `active_owner_workspace_id` bigint DEFAULT NULL,
  `joined_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_member_workspace_user` (`workspace_id`,`user_id`),
  UNIQUE KEY `uk_workspace_member_single_active_owner` (`active_owner_workspace_id`),
  KEY `idx_workspace_member_user_status` (`user_id`,`status`),
  CONSTRAINT `fk_workspace_member_user` FOREIGN KEY (`user_id`) REFERENCES `app_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_workspace_member_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_workspace_member_active_owner_guard` CHECK ((((`workspace_role` = _utf8mb4'OWNER') and (`status` = _utf8mb4'ACTIVE') and (`active_owner_workspace_id` is not null) and (`active_owner_workspace_id` = `workspace_id`)) or (((`workspace_role` <> _utf8mb4'OWNER') or (`status` <> _utf8mb4'ACTIVE')) and (`active_owner_workspace_id` is null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_membership_invitation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `invited_by_user_id` bigint NOT NULL,
  `recipient_email_canonical` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workspace_role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` binary(32) NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `accepted_at` datetime(6) DEFAULT NULL,
  `revoked_at` datetime(6) DEFAULT NULL,
  `declined_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_membership_invitation_token_hash` (`token_hash`),
  KEY `idx_workspace_membership_invitation_workspace_status` (`workspace_id`,`status`,`created_at`),
  KEY `idx_workspace_membership_invitation_recipient` (`recipient_email_canonical`,`status`,`expires_at`),
  KEY `fk_workspace_membership_invitation_inviter` (`invited_by_user_id`),
  KEY `idx_workspace_membership_invitation_retention` (`status`,`expires_at`,`accepted_at`,`revoked_at`,`declined_at`),
  CONSTRAINT `fk_workspace_membership_invitation_inviter` FOREIGN KEY (`invited_by_user_id`) REFERENCES `app_user` (`id`),
  CONSTRAINT `fk_workspace_membership_invitation_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_public_competency_selection` (
  `workspace_id` bigint NOT NULL,
  `competency_id` bigint NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`workspace_id`,`competency_id`),
  KEY `fk_public_competency_selection_owned_competency` (`competency_id`,`workspace_id`),
  CONSTRAINT `fk_public_competency_selection_owned_competency` FOREIGN KEY (`competency_id`, `workspace_id`) REFERENCES `competency` (`id`, `workspace_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_public_competency_selection_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_public_experience_detail_selection` (
  `workspace_id` bigint NOT NULL,
  `experience_id` bigint NOT NULL,
  `experience_detail_id` bigint NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`workspace_id`,`experience_detail_id`),
  KEY `idx_public_experience_detail_parent` (`workspace_id`,`experience_id`,`display_order`),
  KEY `fk_public_experience_detail_owned_experience` (`experience_id`,`workspace_id`),
  KEY `fk_public_experience_detail_owned_detail` (`experience_detail_id`,`experience_id`),
  CONSTRAINT `fk_public_experience_detail_owned_detail` FOREIGN KEY (`experience_detail_id`, `experience_id`) REFERENCES `experience_detail` (`id`, `experience_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_public_experience_detail_owned_experience` FOREIGN KEY (`experience_id`, `workspace_id`) REFERENCES `experience` (`id`, `workspace_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_public_experience_detail_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_public_experience_placement` (
  `workspace_id` bigint NOT NULL,
  `experience_id` bigint NOT NULL,
  `placement_type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`workspace_id`,`experience_id`,`placement_type`),
  KEY `idx_public_experience_placement_type` (`workspace_id`,`placement_type`,`enabled`,`display_order`),
  KEY `fk_public_experience_placement_owned_experience` (`experience_id`,`workspace_id`),
  CONSTRAINT `fk_public_experience_placement_owned_experience` FOREIGN KEY (`experience_id`, `workspace_id`) REFERENCES `experience` (`id`, `workspace_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_public_experience_placement_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_public_experience_revision` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `revision_number` int NOT NULL,
  `source_config_version` int NOT NULL DEFAULT '1',
  `content_json` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by_user_id` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_public_experience_revision_number` (`workspace_id`,`revision_number`),
  KEY `idx_public_experience_revision_creator` (`created_by_user_id`),
  CONSTRAINT `fk_public_experience_revision_creator` FOREIGN KEY (`created_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_public_experience_revision_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_public_experience_selection` (
  `workspace_id` bigint NOT NULL,
  `experience_id` bigint NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `show_on_timeline` tinyint(1) NOT NULL DEFAULT '1',
  `timeline_label` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`workspace_id`,`experience_id`),
  KEY `fk_public_experience_selection_owned_experience` (`experience_id`,`workspace_id`),
  CONSTRAINT `fk_public_experience_selection_owned_experience` FOREIGN KEY (`experience_id`, `workspace_id`) REFERENCES `experience` (`id`, `workspace_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_public_experience_selection_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_public_page_draft` (
  `workspace_id` bigint NOT NULL,
  `config_version` int NOT NULL DEFAULT '1',
  `dirty_since` datetime(6) DEFAULT NULL,
  `updated_by_user_id` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`workspace_id`),
  KEY `idx_public_page_draft_updater` (`updated_by_user_id`),
  CONSTRAINT `fk_public_page_draft_updater` FOREIGN KEY (`updated_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_public_page_draft_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_public_portfolio_selection` (
  `workspace_id` bigint NOT NULL,
  `portfolio_case_study_id` bigint NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`workspace_id`,`portfolio_case_study_id`),
  KEY `fk_public_portfolio_selection_owned_case` (`portfolio_case_study_id`,`workspace_id`),
  CONSTRAINT `fk_public_portfolio_selection_owned_case` FOREIGN KEY (`portfolio_case_study_id`, `workspace_id`) REFERENCES `portfolio_case_study` (`id`, `workspace_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_public_portfolio_selection_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_public_profile_config` (
  `workspace_id` bigint NOT NULL,
  `show_name` tinyint(1) NOT NULL DEFAULT '1',
  `show_name_en` tinyint(1) NOT NULL DEFAULT '1',
  `show_job_title` tinyint(1) NOT NULL DEFAULT '1',
  `show_bio` tinyint(1) NOT NULL DEFAULT '1',
  `show_core_stack_summary` tinyint(1) NOT NULL DEFAULT '1',
  `show_status_badge` tinyint(1) NOT NULL DEFAULT '1',
  `show_github` tinyint(1) NOT NULL DEFAULT '1',
  `show_email` tinyint(1) NOT NULL DEFAULT '0',
  `show_phone` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`workspace_id`),
  CONSTRAINT `fk_public_profile_config_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_public_profile_revision` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `revision_number` int NOT NULL,
  `source_config_version` int NOT NULL DEFAULT '1',
  `content_json` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by_user_id` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_public_profile_revision_number` (`workspace_id`,`revision_number`),
  KEY `idx_public_profile_revision_creator` (`created_by_user_id`),
  CONSTRAINT `fk_public_profile_revision_creator` FOREIGN KEY (`created_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_public_profile_revision_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_public_skill_selection` (
  `workspace_id` bigint NOT NULL,
  `workspace_skill_id` bigint NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `featured` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`workspace_id`,`workspace_skill_id`),
  KEY `fk_public_skill_selection_owned_skill` (`workspace_skill_id`,`workspace_id`),
  CONSTRAINT `fk_public_skill_selection_owned_skill` FOREIGN KEY (`workspace_skill_id`, `workspace_id`) REFERENCES `workspace_skill` (`id`, `workspace_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_public_skill_selection_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_public_study_selection` (
  `workspace_id` bigint NOT NULL,
  `study_id` bigint NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`workspace_id`,`study_id`),
  KEY `fk_public_study_selection_owned_study` (`study_id`,`workspace_id`),
  CONSTRAINT `fk_public_study_selection_owned_study` FOREIGN KEY (`study_id`, `workspace_id`) REFERENCES `study` (`id`, `workspace_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_public_study_selection_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_public_taxonomy_selection` (
  `workspace_id` bigint NOT NULL,
  `taxonomy_node_id` bigint NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `display_label` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`workspace_id`,`taxonomy_node_id`),
  KEY `idx_public_taxonomy_selection_order` (`workspace_id`,`enabled`,`display_order`,`taxonomy_node_id`),
  KEY `fk_public_taxonomy_selection_node` (`taxonomy_node_id`),
  CONSTRAINT `fk_public_taxonomy_selection_node` FOREIGN KEY (`taxonomy_node_id`) REFERENCES `taxonomy_node` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_public_taxonomy_selection_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_publication_resource` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `revision_id` bigint NOT NULL,
  `resource_type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_key` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_json` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_publication_resource` (`revision_id`,`resource_type`,`resource_key`),
  KEY `idx_workspace_publication_resource_type` (`revision_id`,`resource_type`,`id`),
  CONSTRAINT `fk_workspace_publication_resource_revision` FOREIGN KEY (`revision_id`) REFERENCES `workspace_publication_revision` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_publication_revision` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `revision_number` int NOT NULL,
  `schema_version` int NOT NULL DEFAULT '1',
  `operation_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PUBLISH',
  `source_revision_number` int DEFAULT NULL,
  `profile_revision_id` bigint DEFAULT NULL,
  `experience_revision_id` bigint DEFAULT NULL,
  `draft_config_version` int DEFAULT NULL,
  `published_by_user_id` bigint DEFAULT NULL,
  `published_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_publication_revision_number` (`workspace_id`,`revision_number`),
  KEY `idx_workspace_publication_latest` (`workspace_id`,`published_at`,`id`),
  KEY `idx_workspace_publication_publisher` (`published_by_user_id`),
  KEY `idx_workspace_publication_retention` (`workspace_id`,`created_at`,`revision_number`),
  KEY `idx_workspace_publication_profile_revision` (`profile_revision_id`),
  KEY `idx_workspace_publication_experience_revision` (`experience_revision_id`),
  CONSTRAINT `fk_workspace_publication_experience_revision` FOREIGN KEY (`experience_revision_id`) REFERENCES `workspace_public_experience_revision` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_workspace_publication_profile_revision` FOREIGN KEY (`profile_revision_id`) REFERENCES `workspace_public_profile_revision` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_workspace_publication_revision_publisher` FOREIGN KEY (`published_by_user_id`) REFERENCES `app_user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_workspace_publication_revision_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_purge_checkpoint` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `purge_job_id` bigint NOT NULL,
  `store_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `candidate_count` bigint NOT NULL DEFAULT '0',
  `blocker_code` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `inspection_summary` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_inspected_at` datetime(6) DEFAULT NULL,
  `completed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_purge_checkpoint_store` (`purge_job_id`,`store_type`),
  CONSTRAINT `fk_workspace_purge_checkpoint_job` FOREIGN KEY (`purge_job_id`) REFERENCES `workspace_purge_job` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_purge_job` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `workspace_public_key` binary(16) NOT NULL,
  `requested_by_user_id` bigint NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eligible_at` datetime(6) NOT NULL,
  `last_inspected_at` datetime(6) DEFAULT NULL,
  `started_at` datetime(6) DEFAULT NULL,
  `completed_at` datetime(6) DEFAULT NULL,
  `attempt_count` int NOT NULL DEFAULT '0',
  `blocker_count` int NOT NULL DEFAULT '0',
  `inventory_version` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_error_code` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_purge_job_workspace` (`workspace_id`),
  KEY `idx_workspace_purge_job_status_eligible` (`status`,`eligible_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_skill` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `skill_id` bigint NOT NULL,
  `skill_level` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skill_version` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skill_comment` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usage_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LEARNING',
  `is_core` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_skill_workspace_catalog` (`workspace_id`,`skill_id`),
  UNIQUE KEY `uk_workspace_skill_id_workspace_public_config` (`id`,`workspace_id`),
  KEY `idx_workspace_skill_workspace_order` (`workspace_id`,`display_order`),
  KEY `fk_workspace_skill_catalog` (`skill_id`),
  CONSTRAINT `fk_workspace_skill_catalog` FOREIGN KEY (`skill_id`) REFERENCES `skill` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_workspace_skill_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_slug_alias` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `slug` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `alias_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ALIAS',
  `created_at` datetime(6) NOT NULL,
  `retired_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_slug_alias_slug` (`slug`),
  KEY `idx_workspace_slug_alias_workspace` (`workspace_id`),
  CONSTRAINT `fk_workspace_slug_alias_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_taxonomy_scheme_subscription` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `scheme_id` bigint NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `primary_scheme` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_taxonomy_scheme_subscription` (`workspace_id`,`scheme_id`),
  KEY `idx_workspace_taxonomy_subscription_order` (`workspace_id`,`enabled`,`display_order`,`id`),
  KEY `idx_workspace_taxonomy_subscription_scheme` (`scheme_id`),
  CONSTRAINT `fk_workspace_taxonomy_subscription_scheme` FOREIGN KEY (`scheme_id`) REFERENCES `taxonomy_scheme` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_workspace_taxonomy_subscription_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_visitor_daily_visit` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `visitor_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `visited_date` date NOT NULL,
  `first_visited_at` datetime(6) NOT NULL,
  `last_visited_at` datetime(6) NOT NULL,
  `page_views` bigint NOT NULL DEFAULT '1',
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_bot` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_visitor_daily_scope` (`workspace_id`,`visitor_hash`,`visited_date`),
  KEY `idx_workspace_visitor_daily_date` (`workspace_id`,`visited_date`),
  CONSTRAINT `fk_workspace_visitor_daily_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_visitor_hourly_visit` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint NOT NULL,
  `visitor_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `visited_date` date NOT NULL,
  `visited_hour` int NOT NULL,
  `page_views` bigint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_workspace_visitor_hourly_scope` (`workspace_id`,`visitor_hash`,`visited_date`,`visited_hour`),
  KEY `idx_workspace_visitor_hourly_date` (`workspace_id`,`visited_date`),
  CONSTRAINT `fk_workspace_visitor_hourly_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
