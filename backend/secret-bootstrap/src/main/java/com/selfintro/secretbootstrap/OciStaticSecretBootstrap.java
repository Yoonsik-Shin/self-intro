package com.selfintro.secretbootstrap;

import com.oracle.bmc.auth.ConfigFileAuthenticationDetailsProvider;
import com.oracle.bmc.secrets.SecretsClient;
import com.oracle.bmc.secrets.model.Base64SecretBundleContentDetails;
import com.oracle.bmc.secrets.model.SecretBundleContentDetails;
import com.oracle.bmc.secrets.requests.GetSecretBundleRequest;
import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

public final class OciStaticSecretBootstrap {

    private static final Pattern KEY_PATTERN = Pattern.compile("[A-Z][A-Z0-9_]*");
    private static final String SECRET_OCID_PREFIX = "ocid1." + "vaultsecret.";

    private OciStaticSecretBootstrap() {}

    public static void main(String[] args) throws Exception {
        String configFile = requiredEnvironment("OCI_CONFIG_FILE");
        String profile = environmentOrDefault("OCI_PROFILE", "DEFAULT");
        Path manifest = Path.of(requiredEnvironment("STATIC_SECRET_MANIFEST"));
        Path output = Path.of(requiredEnvironment("STATIC_SECRET_OUTPUT_DIRECTORY"));

        ConfigFileAuthenticationDetailsProvider provider =
                new ConfigFileAuthenticationDetailsProvider(configFile, profile);
        try (SecretsClient client = SecretsClient.builder().build(provider)) {
            int written = run(manifest, output, reference -> resolve(client, reference));
            System.out.println("OCI static secret bootstrap completed: " + written + " files");
        }
    }

    static int run(Path manifest, Path output, SecretReader reader) throws IOException {
        if (!Files.isRegularFile(manifest, LinkOption.NOFOLLOW_LINKS)) {
            throw new IllegalStateException("Static secret manifest is missing or unsafe");
        }
        if (!Files.isDirectory(output, LinkOption.NOFOLLOW_LINKS)) {
            throw new IllegalStateException("Static secret output directory is missing or unsafe");
        }

        Map<String, String> mappings = parseManifest(Files.readAllLines(manifest));
        for (Map.Entry<String, String> mapping : mappings.entrySet()) {
            byte[] value = reader.read(mapping.getValue());
            if (value == null || value.length == 0) {
                throw new IllegalStateException("OCI secret bundle is empty: " + mapping.getKey());
            }
            writeAtomically(output, mapping.getKey(), value);
        }
        return mappings.size();
    }

    static Map<String, String> parseManifest(List<String> lines) {
        Map<String, String> mappings = new LinkedHashMap<>();
        for (int index = 0; index < lines.size(); index++) {
            String line = lines.get(index).trim();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            int separator = line.indexOf('=');
            if (separator <= 0 || separator == line.length() - 1) {
                throw new IllegalStateException(
                        "Invalid static secret manifest line: " + (index + 1));
            }
            String key = line.substring(0, separator).trim();
            String reference = line.substring(separator + 1).trim();
            if (!KEY_PATTERN.matcher(key).matches()) {
                throw new IllegalStateException(
                        "Invalid static secret key at line: " + (index + 1));
            }
            if (!reference.startsWith(SECRET_OCID_PREFIX)) {
                throw new IllegalStateException(
                        "Invalid OCI secret reference at line: " + (index + 1));
            }
            if (mappings.putIfAbsent(key, reference) != null) {
                throw new IllegalStateException("Duplicate static secret key: " + key);
            }
        }
        if (mappings.isEmpty()) {
            throw new IllegalStateException("Static secret manifest is empty");
        }
        return mappings;
    }

    private static byte[] resolve(SecretsClient client, String reference) {
        SecretBundleContentDetails content =
                client.getSecretBundle(GetSecretBundleRequest.builder().secretId(reference).build())
                        .getSecretBundle()
                        .getSecretBundleContent();
        if (!(content instanceof Base64SecretBundleContentDetails base64Content)
                || base64Content.getContent() == null) {
            throw new IllegalStateException("OCI secret bundle is not Base64 content");
        }
        return Base64.getDecoder().decode(base64Content.getContent());
    }

    private static void writeAtomically(Path directory, String key, byte[] value)
            throws IOException {
        Path target = directory.resolve(key);
        Path temporary = Files.createTempFile(directory, ".static-secret-", ".tmp");
        try {
            Files.setPosixFilePermissions(temporary, PosixFilePermissions.fromString("rw-------"));
            Files.write(temporary, value);
            Files.setPosixFilePermissions(temporary, PosixFilePermissions.fromString("r--------"));
            try {
                Files.move(
                        temporary,
                        target,
                        StandardCopyOption.ATOMIC_MOVE,
                        StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException exception) {
                Files.move(temporary, target, StandardCopyOption.REPLACE_EXISTING);
            }
            Files.setPosixFilePermissions(target, PosixFilePermissions.fromString("r--------"));
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    private static String requiredEnvironment(String key) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Required environment setting is missing: " + key);
        }
        return value;
    }

    private static String environmentOrDefault(String key, String fallback) {
        String value = System.getenv(key);
        return value == null || value.isBlank() ? fallback : value;
    }

    @FunctionalInterface
    interface SecretReader {
        byte[] read(String reference);
    }
}
