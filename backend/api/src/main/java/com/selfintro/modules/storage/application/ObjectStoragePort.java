package com.selfintro.modules.storage.application;

import java.time.Duration;
import java.util.Collection;

/**
 * 클라우드 중립적인 객체 저장소 계약. application/domain 계층은 S3, OCI Object Storage, Azure Blob SDK 타입을 알지 못한다.
 */
public interface ObjectStoragePort {

    PresignedObject presignPut(String objectKey, String contentType, Duration signatureDuration);

    void delete(String objectKey);

    void deleteAll(Collection<String> objectKeys);

    String publicUrl(String objectKey);

    ObjectMetadata stat(String objectKey);

    /** Reads a private object through the server-side adapter without exposing a signed URL. */
    byte[] read(String objectKey, long maxBytes);

    /**
     * Counts currently visible objects under the same prefix in both public and private buckets.
     * Implementations must not return or log object keys.
     */
    PrefixInventory inspectPrefix(String prefix);

    /**
     * Permanently removes every current object, version, delete marker, and incomplete multipart
     * upload under one validated workspace prefix. Implementations must fail closed unless their
     * destructive feature flag is explicitly enabled and must verify that the prefix is empty.
     */
    PrefixPurgeResult purgePrefix(String prefix);

    record PresignedObject(String uploadUrl, String publicUrl) {}

    record ObjectMetadata(long contentLength, String contentType) {}

    record PrefixInventory(
            long publicObjectCount,
            long privateObjectCount,
            long totalBytes,
            long nonCurrentVersionCount,
            long nonCurrentVersionBytes,
            long deleteMarkerCount,
            long incompleteMultipartUploadCount) {
        public long totalObjectCount() {
            return publicObjectCount + privateObjectCount;
        }

        public long totalPurgeCandidateCount() {
            return totalObjectCount()
                    + nonCurrentVersionCount
                    + deleteMarkerCount
                    + incompleteMultipartUploadCount;
        }

        public long totalStoredBytes() {
            return totalBytes + nonCurrentVersionBytes;
        }
    }

    record PrefixPurgeResult(
            long abortedMultipartUploadCount,
            long deletedVersionOrMarkerCount,
            long deletedCurrentObjectCount) {
        public long totalDeletedCandidateCount() {
            return abortedMultipartUploadCount
                    + deletedVersionOrMarkerCount
                    + deletedCurrentObjectCount;
        }
    }
}
