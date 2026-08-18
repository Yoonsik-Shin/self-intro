package com.selfintro.modules.skill.domain.entity;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SkillCatalogBoundaryTest {

    @Test
    void catalogDefinitionDoesNotOwnWorkspacePresentationValues() {
        Skill skill = Skill.createCatalog("Spring Boot", "FRAMEWORK", "spring", "6DB33F");

        assertThat(skill.getName()).isEqualTo("Spring Boot");
        assertThat(skill.getCategory()).isEqualTo("FRAMEWORK");
        assertThat(skill.getBadgeKey()).isEqualTo("spring");
        assertThat(skill.getBadgeColor()).isEqualTo("6DB33F");
        assertThat(skill.getSkillLevel()).isNull();
        assertThat(skill.getSkillVersion()).isNull();
        assertThat(skill.getComment()).isNull();
        assertThat(skill.getUsageType()).isEqualTo("CATALOG");
        assertThat(skill.isCore()).isFalse();
        assertThat(skill.getDisplayOrder()).isZero();
    }

    @Test
    void catalogUpdatePreservesLegacyPresentationValuesUntilMigrationRemovesThem() {
        Skill skill =
                Skill.create(
                        "Java",
                        "LANGUAGE",
                        "ADVANCED",
                        "21",
                        "실무 메모",
                        "WORK_EXPERIENCE",
                        "java",
                        "E76F00",
                        true,
                        3);

        skill.updateCatalogDefinition("Java SE", "LANGUAGE", "openjdk", "437291");

        assertThat(skill.getName()).isEqualTo("Java SE");
        assertThat(skill.getBadgeKey()).isEqualTo("openjdk");
        assertThat(skill.getSkillLevel()).isEqualTo("ADVANCED");
        assertThat(skill.getSkillVersion()).isEqualTo("21");
        assertThat(skill.getComment()).isEqualTo("실무 메모");
        assertThat(skill.getUsageType()).isEqualTo("WORK_EXPERIENCE");
        assertThat(skill.isCore()).isTrue();
        assertThat(skill.getDisplayOrder()).isEqualTo(3);
    }
}
