package com.selfintro.modules.storage.infrastructure;

import com.selfintro.modules.storage.application.ObjectStoragePort;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Delete;
import software.amazon.awssdk.services.s3.model.DeleteObjectsRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.ListMultipartUploadsRequest;
import software.amazon.awssdk.services.s3.model.ListObjectVersionsRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ObjectIdentifier;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

@Component
@RequiredArgsConstructor
public class S3CompatibleObjectStorageAdapter implements ObjectStoragePort {

    private static final String PRIVATE_FINAL_PDF_SEGMENT = "/print-template/final-pdf/";
    private static final Pattern WORKSPACE_PREFIX = Pattern.compile("^workspaces/[1-9][0-9]*/$");
    private static final int MAX_DELETE_OBJECTS_BATCH_SIZE = 1000;

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${app.storage.bucket}")
    private String bucket;

    @Value("${app.storage.private-bucket}")
    private String privateBucket;

    @Value("${app.storage.public-base-url}")
    private String publicBaseUrl;

    @Value("${app.storage.presigned-download-ttl-seconds:900}")
    private long presignedDownloadTtlSeconds;

    @Value("${app.workspace-purge.object-storage-delete-enabled:false}")
    private boolean workspacePurgeDeleteEnabled;

    @Override
    public PresignedObject presignPut(
            String objectKey, String contentType, Duration signatureDuration) {
        PutObjectRequest request =
                PutObjectRequest.builder()
                        .bucket(resolveBucket(objectKey))
                        .key(objectKey)
                        .contentType(contentType)
                        .build();
        PresignedPutObjectRequest presigned =
                s3Presigner.presignPutObject(
                        builder ->
                                builder.signatureDuration(signatureDuration)
                                        .putObjectRequest(request));
        return new PresignedObject(presigned.url().toString(), publicUrl(objectKey));
    }

    @Override
    public void delete(String objectKey) {
        s3Client.deleteObject(builder -> builder.bucket(resolveBucket(objectKey)).key(objectKey));
    }

    @Override
    public void deleteAll(Collection<String> objectKeys) {
        if (objectKeys == null || objectKeys.isEmpty()) {
            return;
        }
        Map<String, List<String>> keysByBucket =
                objectKeys.stream()
                        .filter(key -> key != null && !key.isBlank())
                        .collect(Collectors.groupingBy(this::resolveBucket));
        keysByBucket.forEach(
                (targetBucket, keys) -> {
                    List<ObjectIdentifier> identifiers =
                            keys.stream()
                                    .map(key -> ObjectIdentifier.builder().key(key).build())
                                    .toList();
                    Delete delete = Delete.builder().objects(identifiers).build();
                    s3Client.deleteObjects(
                            DeleteObjectsRequest.builder()
                                    .bucket(targetBucket)
                                    .delete(delete)
                                    .build());
                });
    }

    @Override
    public String publicUrl(String objectKey) {
        if (isPrivateObjectKey(objectKey)) {
            GetObjectRequest request =
                    GetObjectRequest.builder().bucket(privateBucket).key(objectKey).build();
            PresignedGetObjectRequest presigned =
                    s3Presigner.presignGetObject(
                            builder ->
                                    builder.signatureDuration(
                                                    Duration.ofSeconds(presignedDownloadTtlSeconds))
                                            .getObjectRequest(request));
            return presigned.url().toString();
        }
        return publicBaseUrl + "/" + objectKey;
    }

    @Override
    public ObjectMetadata stat(String objectKey) {
        HeadObjectResponse response =
                s3Client.headObject(
                        builder -> builder.bucket(resolveBucket(objectKey)).key(objectKey));
        return new ObjectMetadata(response.contentLength(), response.contentType());
    }

    @Override
    public byte[] read(String objectKey, long maxBytes) {
        if (maxBytes <= 0) {
            throw new IllegalArgumentException("객체 읽기 제한 크기가 올바르지 않습니다.");
        }
        HeadObjectResponse metadata =
                s3Client.headObject(
                        builder -> builder.bucket(resolveBucket(objectKey)).key(objectKey));
        if (metadata.contentLength() == null
                || metadata.contentLength() <= 0
                || metadata.contentLength() > maxBytes) {
            throw new IllegalArgumentException("객체 크기가 허용 범위를 벗어났습니다.");
        }
        byte[] bytes =
                s3Client.getObjectAsBytes(
                                builder -> builder.bucket(resolveBucket(objectKey)).key(objectKey))
                        .asByteArray();
        if (bytes.length == 0 || bytes.length > maxBytes) {
            throw new IllegalArgumentException("객체 크기가 허용 범위를 벗어났습니다.");
        }
        return bytes;
    }

    @Override
    public PrefixInventory inspectPrefix(String prefix) {
        validateWorkspacePrefix(prefix);
        BucketInventory publicInventory = inspectBucket(bucket, prefix);
        BucketInventory privateInventory = inspectBucket(privateBucket, prefix);
        return new PrefixInventory(
                publicInventory.objectCount(),
                privateInventory.objectCount(),
                publicInventory.totalBytes() + privateInventory.totalBytes(),
                publicInventory.nonCurrentVersionCount()
                        + privateInventory.nonCurrentVersionCount(),
                publicInventory.nonCurrentVersionBytes()
                        + privateInventory.nonCurrentVersionBytes(),
                publicInventory.deleteMarkerCount() + privateInventory.deleteMarkerCount(),
                publicInventory.incompleteMultipartUploadCount()
                        + privateInventory.incompleteMultipartUploadCount());
    }

    @Override
    public PrefixPurgeResult purgePrefix(String prefix) {
        validateWorkspacePrefix(prefix);
        if (!workspacePurgeDeleteEnabled) {
            throw new IllegalStateException("객체 저장소 purge 삭제 기능이 비활성화되어 있습니다.");
        }

        BucketPurgeResult publicResult = purgeBucket(bucket, prefix);
        BucketPurgeResult privateResult = purgeBucket(privateBucket, prefix);
        PrefixInventory remaining = inspectPrefix(prefix);
        if (remaining.totalPurgeCandidateCount() != 0) {
            throw new IllegalStateException("객체 저장소 purge 후 잔여 데이터가 감지되었습니다.");
        }
        return new PrefixPurgeResult(
                publicResult.abortedMultipartUploadCount()
                        + privateResult.abortedMultipartUploadCount(),
                publicResult.deletedVersionOrMarkerCount()
                        + privateResult.deletedVersionOrMarkerCount(),
                publicResult.deletedCurrentObjectCount()
                        + privateResult.deletedCurrentObjectCount());
    }

    private BucketPurgeResult purgeBucket(String targetBucket, String prefix) {
        long abortedMultipartUploadCount = 0;
        ListMultipartUploadsRequest multipartRequest =
                ListMultipartUploadsRequest.builder().bucket(targetBucket).build();
        for (var page : s3Client.listMultipartUploadsPaginator(multipartRequest)) {
            for (var upload : page.uploads()) {
                if (upload.key() == null || !upload.key().startsWith(prefix)) continue;
                s3Client.abortMultipartUpload(
                        builder ->
                                builder.bucket(targetBucket)
                                        .key(upload.key())
                                        .uploadId(upload.uploadId()));
                abortedMultipartUploadCount++;
            }
        }

        long deletedVersionOrMarkerCount = 0;
        ListObjectVersionsRequest versionsRequest =
                ListObjectVersionsRequest.builder().bucket(targetBucket).prefix(prefix).build();
        for (var page : s3Client.listObjectVersionsPaginator(versionsRequest)) {
            List<ObjectIdentifier> identifiers = new ArrayList<>();
            page.versions().stream()
                    .filter(version -> version.key() != null && version.key().startsWith(prefix))
                    .map(
                            version ->
                                    ObjectIdentifier.builder()
                                            .key(version.key())
                                            .versionId(version.versionId())
                                            .build())
                    .forEach(identifiers::add);
            page.deleteMarkers().stream()
                    .filter(marker -> marker.key() != null && marker.key().startsWith(prefix))
                    .map(
                            marker ->
                                    ObjectIdentifier.builder()
                                            .key(marker.key())
                                            .versionId(marker.versionId())
                                            .build())
                    .forEach(identifiers::add);
            deletedVersionOrMarkerCount += deleteIdentifiers(targetBucket, identifiers);
        }

        long deletedCurrentObjectCount = 0;
        ListObjectsV2Request currentRequest =
                ListObjectsV2Request.builder().bucket(targetBucket).prefix(prefix).build();
        for (var page : s3Client.listObjectsV2Paginator(currentRequest)) {
            List<ObjectIdentifier> identifiers =
                    page.contents().stream()
                            .filter(
                                    object ->
                                            object.key() != null && object.key().startsWith(prefix))
                            .map(object -> ObjectIdentifier.builder().key(object.key()).build())
                            .toList();
            deletedCurrentObjectCount += deleteIdentifiers(targetBucket, identifiers);
        }
        return new BucketPurgeResult(
                abortedMultipartUploadCount,
                deletedVersionOrMarkerCount,
                deletedCurrentObjectCount);
    }

    private long deleteIdentifiers(String targetBucket, List<ObjectIdentifier> identifiers) {
        long deleted = 0;
        for (int start = 0; start < identifiers.size(); start += MAX_DELETE_OBJECTS_BATCH_SIZE) {
            int end = Math.min(start + MAX_DELETE_OBJECTS_BATCH_SIZE, identifiers.size());
            List<ObjectIdentifier> batch = identifiers.subList(start, end);
            Delete delete = Delete.builder().objects(batch).quiet(true).build();
            var response =
                    s3Client.deleteObjects(
                            DeleteObjectsRequest.builder()
                                    .bucket(targetBucket)
                                    .delete(delete)
                                    .build());
            if (response.hasErrors()) {
                throw new IllegalStateException("객체 저장소 purge batch 삭제에 실패했습니다.");
            }
            deleted += batch.size();
        }
        return deleted;
    }

    private void validateWorkspacePrefix(String prefix) {
        if (prefix == null || !WORKSPACE_PREFIX.matcher(prefix).matches()) {
            throw new IllegalArgumentException("객체 inventory prefix가 올바르지 않습니다.");
        }
    }

    private BucketInventory inspectBucket(String targetBucket, String prefix) {
        long objectCount = 0;
        long totalBytes = 0;
        ListObjectsV2Request request =
                ListObjectsV2Request.builder().bucket(targetBucket).prefix(prefix).build();
        for (var page : s3Client.listObjectsV2Paginator(request)) {
            objectCount += page.contents().size();
            for (var object : page.contents()) {
                if (object.size() != null && object.size() > 0) {
                    totalBytes += object.size();
                }
            }
        }
        long nonCurrentVersionCount = 0;
        long nonCurrentVersionBytes = 0;
        long deleteMarkerCount = 0;
        ListObjectVersionsRequest versionsRequest =
                ListObjectVersionsRequest.builder().bucket(targetBucket).prefix(prefix).build();
        for (var page : s3Client.listObjectVersionsPaginator(versionsRequest)) {
            deleteMarkerCount += page.deleteMarkers().size();
            for (var version : page.versions()) {
                if (!Boolean.TRUE.equals(version.isLatest())) {
                    nonCurrentVersionCount++;
                    if (version.size() != null && version.size() > 0) {
                        nonCurrentVersionBytes += version.size();
                    }
                }
            }
        }

        long incompleteMultipartUploadCount = 0;
        // Some S3-compatible providers return an empty result when a slash-terminated prefix is
        // supplied to ListMultipartUploads. Scan the paginated bucket inventory and apply the
        // already validated workspace prefix locally so an unfinished upload cannot be missed.
        ListMultipartUploadsRequest multipartRequest =
                ListMultipartUploadsRequest.builder().bucket(targetBucket).build();
        for (var page : s3Client.listMultipartUploadsPaginator(multipartRequest)) {
            incompleteMultipartUploadCount +=
                    page.uploads().stream()
                            .filter(
                                    upload ->
                                            upload.key() != null && upload.key().startsWith(prefix))
                            .count();
        }
        return new BucketInventory(
                objectCount,
                totalBytes,
                nonCurrentVersionCount,
                nonCurrentVersionBytes,
                deleteMarkerCount,
                incompleteMultipartUploadCount);
    }

    private String resolveBucket(String objectKey) {
        return isPrivateObjectKey(objectKey) ? privateBucket : bucket;
    }

    private boolean isPrivateObjectKey(String objectKey) {
        return objectKey != null
                && (objectKey.contains(PRIVATE_FINAL_PDF_SEGMENT)
                        || objectKey.contains("/job-posting/screenshot-temp/"));
    }

    private record BucketInventory(
            long objectCount,
            long totalBytes,
            long nonCurrentVersionCount,
            long nonCurrentVersionBytes,
            long deleteMarkerCount,
            long incompleteMultipartUploadCount) {}

    private record BucketPurgeResult(
            long abortedMultipartUploadCount,
            long deletedVersionOrMarkerCount,
            long deletedCurrentObjectCount) {}
}
