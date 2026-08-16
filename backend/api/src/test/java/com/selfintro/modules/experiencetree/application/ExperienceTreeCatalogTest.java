package com.selfintro.modules.experiencetree.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

class ExperienceTreeCatalogTest {
    @Test
    void parsesCatalogAndTopologyWithValidReferences() throws Exception {
        ObjectMapper mapper = new ObjectMapper(new YAMLFactory()).findAndRegisterModules();
        Resource[] resources =
                new PathMatchingResourcePatternResolver()
                        .getResources("classpath*:experience-tree/*/*.yaml");
        Set<String> situationKeys = new HashSet<>();
        Set<String> childKeys = new HashSet<>();
        int count = 0;
        Set<java.time.LocalDate> reviewDates = new HashSet<>();
        Map<com.selfintro.modules.experiencetree.domain.enums.DecisionDomain, Integer>
                domainCounts =
                        new EnumMap<>(
                                com.selfintro.modules.experiencetree.domain.enums.DecisionDomain
                                        .class);

        for (Resource resource : resources) {
            var documents =
                    mapper.readerFor(ExperienceTreeDocument.class)
                            .readValues(resource.getInputStream());
            while (documents.hasNext()) {
                ExperienceTreeDocument document = (ExperienceTreeDocument) documents.next();
                count++;
                domainCounts.merge(document.domain(), 1, Integer::sum);
                reviewDates.add(document.nextReviewAt());
                assertThat(situationKeys.add(document.stableKey())).isTrue();
                assertThat(document.title()).isNotBlank();
                assertThat(document.problem()).isNotBlank();
                assertThat(document.verifiedAt()).isNotNull();
                assertThat(document.nextReviewAt()).isAfter(document.verifiedAt());
                assertThat(document.options()).hasSizeBetween(2, 5);
                assertThat(document.sources()).isNotEmpty();
                assertThat(document.warnings()).isNotEmpty();
                assertThat(document.sources())
                        .allSatisfy(
                                source -> {
                                    assertThat(source.sourceType()).isNotNull();
                                    assertThat(source.title()).isNotBlank();
                                    assertThat(source.url()).startsWith("https://");
                                    assertThat(source.publisher()).isNotBlank();
                                    assertThat(source.accessedAt()).isNotNull();
                                });
                document.options()
                        .forEach(
                                option -> {
                                    assertThat(childKeys.add(option.stableKey())).isTrue();
                                    assertThat(option.tradeoffs()).isNotEmpty();
                                });
                document.warnings()
                        .forEach(
                                warning -> {
                                    assertThat(childKeys.add(warning.stableKey())).isTrue();
                                    assertThat(warning.failureCondition()).isNotBlank();
                                    assertThat(warning.correction()).isNotBlank();
                                });
            }
        }

        assertThat(count).isGreaterThanOrEqualTo(50);
        assertThat(domainCounts.values())
                .allSatisfy(value -> assertThat(value).isGreaterThanOrEqualTo(10));
        assertThat(reviewDates).hasSizeGreaterThanOrEqualTo(4);

        Resource topologyResource =
                new PathMatchingResourcePatternResolver()
                        .getResource("classpath:experience-tree/topology.yaml");
        ExperienceTreeTopologyDocument topology =
                mapper.readValue(
                        topologyResource.getInputStream(), ExperienceTreeTopologyDocument.class);
        assertThat(topology.parents()).isNotEmpty();
        assertThat(topology.relations()).hasSize(33);
        assertThat(topology.studyLinks()).hasSize(11);
        assertThat(topology.parents().keySet()).isSubsetOf(situationKeys);
        assertThat(topology.parents().values()).isSubsetOf(situationKeys);
        assertThat(topology.relations())
                .allSatisfy(
                        relation -> {
                            assertThat(relation.sourceKey()).isIn(situationKeys);
                            assertThat(relation.targetKey()).isIn(situationKeys);
                            assertThat(relation.sourceKey()).isNotEqualTo(relation.targetKey());
                        });
        assertThat(topology.studyLinks())
                .allSatisfy(link -> assertThat(link.situationKey()).isIn(situationKeys));

        Map<String, String> parents = topology.parents();
        for (String situationKey : situationKeys) {
            Set<String> path = new HashSet<>();
            String current = situationKey;
            while (current != null) {
                assertThat(path.add(current)).as("parent cycle at %s", situationKey).isTrue();
                current = parents.get(current);
            }
        }

        assertThat(
                        topology.studyLinks().stream()
                                .map(ExperienceTreeTopologyDocument.StudyLinkDocument::seedKey)
                                .collect(Collectors.toSet()))
                .hasSize(topology.studyLinks().size());
    }
}
