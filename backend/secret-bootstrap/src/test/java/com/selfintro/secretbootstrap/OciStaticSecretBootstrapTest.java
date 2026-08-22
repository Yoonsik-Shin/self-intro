package com.selfintro.secretbootstrap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OciStaticSecretBootstrapTest {

    private static final String REFERENCE = "ocid1." + "vaultsecret.oc1..example";

    @TempDir Path directory;

    @Test
    void writesOneOwnerReadableFilePerManifestEntry() throws Exception {
        Path manifest = directory.resolve("manifest");
        Path output = Files.createDirectory(directory.resolve("output"));
        Files.writeString(
                manifest, "# production rollout test\nSPRING_MAIL_PASSWORD=" + REFERENCE + "\n");

        int count =
                OciStaticSecretBootstrap.run(
                        manifest, output, ignored -> "secret-value".getBytes());

        Path secret = output.resolve("SPRING_MAIL_PASSWORD");
        assertThat(count).isOne();
        assertThat(Files.readString(secret)).isEqualTo("secret-value");
        assertThat(Files.getPosixFilePermissions(secret))
                .isEqualTo(PosixFilePermissions.fromString("r--------"));
    }

    @Test
    void rejectsDuplicateKeysAndNonSecretOcids() {
        assertThatThrownBy(
                        () ->
                                OciStaticSecretBootstrap.parseManifest(
                                        List.of(
                                                "DB_PASSWORD=" + REFERENCE,
                                                "DB_PASSWORD=" + REFERENCE)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Duplicate");

        assertThatThrownBy(
                        () ->
                                OciStaticSecretBootstrap.parseManifest(
                                        List.of("DB_PASSWORD=ocid1.key.oc1..example")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("reference");
    }
}
