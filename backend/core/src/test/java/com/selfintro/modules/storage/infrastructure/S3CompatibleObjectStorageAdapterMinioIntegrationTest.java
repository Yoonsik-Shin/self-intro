package com.selfintro.modules.storage.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.selfintro.modules.storage.application.ObjectStoragePort.PrefixInventory;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.BucketVersioningStatus;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.VersioningConfiguration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@EnabledIfEnvironmentVariable(named = "SELFINTRO_MINIO_INTEGRATION", matches = "true")
class S3CompatibleObjectStorageAdapterMinioIntegrationTest {

    @Test
    void countsRealComposeMinioObjectsAcrossPublicAndPrivateBucketsThenCleansFixture() {
        String endpoint = environmentOrDefault("SELFINTRO_MINIO_ENDPOINT", "http://localhost:9000");
        String accessKey = environmentOrDefault("SELFINTRO_MINIO_ACCESS_KEY", "minioadmin");
        String secretKey = environmentOrDefault("SELFINTRO_MINIO_SECRET_KEY", "minioadmin");
        String publicBucket =
                environmentOrDefault("SELFINTRO_MINIO_PUBLIC_BUCKET", "self-intro-images");
        String privateBucket =
                environmentOrDefault("SELFINTRO_MINIO_PRIVATE_BUCKET", "self-intro-private");
        String prefix = "workspaces/9223372036854770000/";
        String marker = UUID.randomUUID().toString();
        List<String> publicKeys =
                List.of(
                        prefix + "experience/gallery/" + marker + "-a.txt",
                        prefix + "study/markdown/" + marker + "-b.txt");
        String privateKey = prefix + "print-template/final-pdf/" + marker + ".pdf";

        try (S3Client client = client(endpoint, accessKey, secretKey)) {
            S3CompatibleObjectStorageAdapter adapter =
                    new S3CompatibleObjectStorageAdapter(client, mock(S3Presigner.class));
            ReflectionTestUtils.setField(adapter, "bucket", publicBucket);
            ReflectionTestUtils.setField(adapter, "privateBucket", privateBucket);

            try {
                put(client, publicBucket, publicKeys.get(0), "one");
                put(client, publicBucket, publicKeys.get(1), "two-two");
                put(client, privateBucket, privateKey, "private-pdf");

                PrefixInventory inventory = adapter.inspectPrefix(prefix);

                assertThat(inventory.publicObjectCount()).isEqualTo(2);
                assertThat(inventory.privateObjectCount()).isEqualTo(1);
                assertThat(inventory.totalBytes())
                        .isEqualTo(bytes("one") + bytes("two-two") + bytes("private-pdf"));
                assertThat(inventory.nonCurrentVersionCount()).isZero();
                assertThat(inventory.deleteMarkerCount()).isZero();
                assertThat(inventory.incompleteMultipartUploadCount()).isZero();
            } finally {
                publicKeys.forEach(
                        key ->
                                client.deleteObject(
                                        builder -> builder.bucket(publicBucket).key(key)));
                client.deleteObject(builder -> builder.bucket(privateBucket).key(privateKey));
            }

            assertThat(adapter.inspectPrefix(prefix).totalObjectCount()).isZero();
        }
    }

    @Test
    void countsVersionsDeleteMarkersAndMultipartUploadsInIsolatedVersionedBuckets() {
        String endpoint = environmentOrDefault("SELFINTRO_MINIO_ENDPOINT", "http://localhost:9000");
        String accessKey = environmentOrDefault("SELFINTRO_MINIO_ACCESS_KEY", "minioadmin");
        String secretKey = environmentOrDefault("SELFINTRO_MINIO_SECRET_KEY", "minioadmin");
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        String publicBucket = "selfintro-purge-it-" + suffix + "-p";
        String privateBucket = "selfintro-purge-it-" + suffix + "-r";
        String prefix = "workspaces/9223372036854770001/";
        boolean publicCreated = false;
        boolean privateCreated = false;

        try (S3Client client = client(endpoint, accessKey, secretKey)) {
            try {
                client.createBucket(builder -> builder.bucket(publicBucket));
                publicCreated = true;
                client.createBucket(builder -> builder.bucket(privateBucket));
                privateCreated = true;
                enableVersioning(client, publicBucket);
                enableVersioning(client, privateBucket);

                String removedKey = prefix + "experience/gallery/versioned.txt";
                String activeKey = prefix + "study/markdown/current.txt";
                String multipartKey = prefix + "portfolio/gallery/pending.bin";
                put(client, publicBucket, removedKey, "version-one");
                put(client, publicBucket, removedKey, "version-two-two");
                client.deleteObject(builder -> builder.bucket(publicBucket).key(removedKey));
                put(client, publicBucket, activeKey, "current");
                String uploadId =
                        client.createMultipartUpload(
                                        builder -> builder.bucket(publicBucket).key(multipartKey))
                                .uploadId();
                client.uploadPart(
                        builder ->
                                builder.bucket(publicBucket)
                                        .key(multipartKey)
                                        .uploadId(uploadId)
                                        .partNumber(1),
                        RequestBody.fromBytes(new byte[6 * 1024 * 1024]));
                assertThat(
                                client.listParts(
                                                builder ->
                                                        builder.bucket(publicBucket)
                                                                .key(multipartKey)
                                                                .uploadId(uploadId))
                                        .parts())
                        .hasSize(1);
                assertThat(
                                client.listMultipartUploads(builder -> builder.bucket(publicBucket))
                                        .uploads())
                        .hasSize(1);
                S3CompatibleObjectStorageAdapter adapter =
                        new S3CompatibleObjectStorageAdapter(client, mock(S3Presigner.class));
                ReflectionTestUtils.setField(adapter, "bucket", publicBucket);
                ReflectionTestUtils.setField(adapter, "privateBucket", privateBucket);

                PrefixInventory inventory = adapter.inspectPrefix(prefix);

                assertThat(inventory.publicObjectCount()).isEqualTo(1);
                assertThat(inventory.privateObjectCount()).isZero();
                assertThat(inventory.nonCurrentVersionCount()).isEqualTo(2);
                assertThat(inventory.nonCurrentVersionBytes())
                        .isEqualTo(bytes("version-one") + bytes("version-two-two"));
                assertThat(inventory.deleteMarkerCount()).isEqualTo(1);
                assertThat(inventory.incompleteMultipartUploadCount()).isEqualTo(1);
                assertThat(inventory.totalPurgeCandidateCount()).isEqualTo(5);

                ReflectionTestUtils.setField(adapter, "workspacePurgeDeleteEnabled", true);
                var purgeResult = adapter.purgePrefix(prefix);

                assertThat(purgeResult.abortedMultipartUploadCount()).isEqualTo(1);
                assertThat(purgeResult.deletedVersionOrMarkerCount()).isEqualTo(4);
                assertThat(purgeResult.deletedCurrentObjectCount()).isZero();
                assertThat(purgeResult.totalDeletedCandidateCount()).isEqualTo(5);
                assertThat(adapter.inspectPrefix(prefix).totalPurgeCandidateCount()).isZero();
                assertThat(adapter.purgePrefix(prefix).totalDeletedCandidateCount()).isZero();
            } finally {
                try {
                    if (publicCreated) cleanupBucket(client, publicBucket);
                } finally {
                    if (privateCreated) cleanupBucket(client, privateBucket);
                }
            }
        }
    }

    @Test
    void purgesCurrentObjectsIdempotentlyInIsolatedUnversionedBuckets() {
        String endpoint = environmentOrDefault("SELFINTRO_MINIO_ENDPOINT", "http://localhost:9000");
        String accessKey = environmentOrDefault("SELFINTRO_MINIO_ACCESS_KEY", "minioadmin");
        String secretKey = environmentOrDefault("SELFINTRO_MINIO_SECRET_KEY", "minioadmin");
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        String publicBucket = "selfintro-purge-it-" + suffix + "-p";
        String privateBucket = "selfintro-purge-it-" + suffix + "-r";
        String prefix = "workspaces/9223372036854770002/";
        boolean publicCreated = false;
        boolean privateCreated = false;

        try (S3Client client = client(endpoint, accessKey, secretKey)) {
            try {
                client.createBucket(builder -> builder.bucket(publicBucket));
                publicCreated = true;
                client.createBucket(builder -> builder.bucket(privateBucket));
                privateCreated = true;
                put(client, publicBucket, prefix + "experience/gallery/current.txt", "public");
                put(
                        client,
                        privateBucket,
                        prefix + "print-template/final-pdf/current.pdf",
                        "private");

                S3CompatibleObjectStorageAdapter adapter =
                        new S3CompatibleObjectStorageAdapter(client, mock(S3Presigner.class));
                ReflectionTestUtils.setField(adapter, "bucket", publicBucket);
                ReflectionTestUtils.setField(adapter, "privateBucket", privateBucket);
                ReflectionTestUtils.setField(adapter, "workspacePurgeDeleteEnabled", true);

                assertThat(adapter.inspectPrefix(prefix).totalPurgeCandidateCount()).isEqualTo(2);
                assertThat(adapter.purgePrefix(prefix).totalDeletedCandidateCount()).isEqualTo(2);
                assertThat(adapter.inspectPrefix(prefix).totalPurgeCandidateCount()).isZero();
                assertThat(adapter.purgePrefix(prefix).totalDeletedCandidateCount()).isZero();
            } finally {
                try {
                    if (publicCreated) cleanupBucket(client, publicBucket);
                } finally {
                    if (privateCreated) cleanupBucket(client, privateBucket);
                }
            }
        }
    }

    private S3Client client(String endpoint, String accessKey, String secretKey) {
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.US_EAST_1)
                .credentialsProvider(
                        StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(accessKey, secretKey)))
                .serviceConfiguration(
                        S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build();
    }

    private void put(S3Client client, String bucket, String key, String content) {
        client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType("text/plain")
                        .build(),
                RequestBody.fromString(content, StandardCharsets.UTF_8));
    }

    private void enableVersioning(S3Client client, String bucket) {
        client.putBucketVersioning(
                builder ->
                        builder.bucket(bucket)
                                .versioningConfiguration(
                                        VersioningConfiguration.builder()
                                                .status(BucketVersioningStatus.ENABLED)
                                                .build()));
    }

    private void cleanupBucket(S3Client client, String bucket) {
        var uploads = new ArrayList<UploadIdentifier>();
        for (var page : client.listMultipartUploadsPaginator(builder -> builder.bucket(bucket))) {
            page.uploads()
                    .forEach(
                            upload ->
                                    uploads.add(
                                            new UploadIdentifier(upload.key(), upload.uploadId())));
        }
        uploads.forEach(
                upload ->
                        client.abortMultipartUpload(
                                builder ->
                                        builder.bucket(bucket)
                                                .key(upload.key())
                                                .uploadId(upload.uploadId())));

        var versions = new ArrayList<VersionIdentifier>();
        for (var page : client.listObjectVersionsPaginator(builder -> builder.bucket(bucket))) {
            page.versions()
                    .forEach(
                            version ->
                                    versions.add(
                                            new VersionIdentifier(
                                                    version.key(), version.versionId())));
            page.deleteMarkers()
                    .forEach(
                            marker ->
                                    versions.add(
                                            new VersionIdentifier(
                                                    marker.key(), marker.versionId())));
        }
        versions.forEach(
                version ->
                        client.deleteObject(
                                builder ->
                                        builder.bucket(bucket)
                                                .key(version.key())
                                                .versionId(version.versionId())));
        client.deleteBucket(builder -> builder.bucket(bucket));
    }

    private long bytes(String value) {
        return value.getBytes(StandardCharsets.UTF_8).length;
    }

    private String environmentOrDefault(String name, String fallback) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? fallback : value;
    }

    private record UploadIdentifier(String key, String uploadId) {}

    private record VersionIdentifier(String key, String versionId) {}
}
