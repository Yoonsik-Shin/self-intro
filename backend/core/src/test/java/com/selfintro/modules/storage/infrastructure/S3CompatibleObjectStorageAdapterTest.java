package com.selfintro.modules.storage.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.storage.application.ObjectStoragePort.PrefixInventory;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteMarkerEntry;
import software.amazon.awssdk.services.s3.model.DeleteObjectsRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectsResponse;
import software.amazon.awssdk.services.s3.model.ListMultipartUploadsRequest;
import software.amazon.awssdk.services.s3.model.ListMultipartUploadsResponse;
import software.amazon.awssdk.services.s3.model.ListObjectVersionsRequest;
import software.amazon.awssdk.services.s3.model.ListObjectVersionsResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.MultipartUpload;
import software.amazon.awssdk.services.s3.model.ObjectVersion;
import software.amazon.awssdk.services.s3.model.S3Object;
import software.amazon.awssdk.services.s3.paginators.ListMultipartUploadsIterable;
import software.amazon.awssdk.services.s3.paginators.ListObjectVersionsIterable;
import software.amazon.awssdk.services.s3.paginators.ListObjectsV2Iterable;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

class S3CompatibleObjectStorageAdapterTest {

    private S3Client s3Client;
    private S3CompatibleObjectStorageAdapter adapter;

    @BeforeEach
    void setUp() {
        s3Client = mock(S3Client.class);
        adapter = new S3CompatibleObjectStorageAdapter(s3Client, mock(S3Presigner.class));
        ReflectionTestUtils.setField(adapter, "bucket", "public-assets");
        ReflectionTestUtils.setField(adapter, "privateBucket", "private-documents");
        when(s3Client.listObjectVersionsPaginator(any(ListObjectVersionsRequest.class)))
                .thenAnswer(
                        ignored -> versionsPaginator(ListObjectVersionsResponse.builder().build()));
        when(s3Client.listMultipartUploadsPaginator(any(ListMultipartUploadsRequest.class)))
                .thenAnswer(
                        ignored ->
                                multipartPaginator(ListMultipartUploadsResponse.builder().build()));
    }

    @Test
    void countsBothBucketsAndEveryPageWithoutReturningObjectKeys() {
        when(s3Client.listObjectsV2Paginator(any(ListObjectsV2Request.class)))
                .thenAnswer(
                        invocation -> {
                            ListObjectsV2Request request = invocation.getArgument(0);
                            if (request.bucket().equals("public-assets")) {
                                return paginator(
                                        response(object("hidden-a.png", 100)),
                                        response(object("hidden-b.png", 200)));
                            }
                            return paginator(response(object("hidden-final.pdf", 300)));
                        });

        PrefixInventory inventory = adapter.inspectPrefix("workspaces/42/");

        assertThat(inventory.publicObjectCount()).isEqualTo(2);
        assertThat(inventory.privateObjectCount()).isEqualTo(1);
        assertThat(inventory.totalObjectCount()).isEqualTo(3);
        assertThat(inventory.totalPurgeCandidateCount()).isEqualTo(3);
        assertThat(inventory.totalBytes()).isEqualTo(600);
        assertThat(inventory.toString()).doesNotContain("hidden-a", "hidden-final");
    }

    @Test
    void countsNonCurrentVersionsDeleteMarkersAndIncompleteMultipartUploadsAcrossBuckets() {
        when(s3Client.listObjectsV2Paginator(any(ListObjectsV2Request.class)))
                .thenAnswer(ignored -> paginator(response(object("current.png", 100))));
        when(s3Client.listObjectVersionsPaginator(any(ListObjectVersionsRequest.class)))
                .thenAnswer(
                        invocation -> {
                            ListObjectVersionsRequest request = invocation.getArgument(0);
                            if (request.bucket().equals("public-assets")) {
                                return versionsPaginator(
                                        ListObjectVersionsResponse.builder()
                                                .versions(
                                                        version("current.png", 100, true),
                                                        version("old-a.png", 40, false))
                                                .deleteMarkers(deleteMarker("removed.png"))
                                                .build(),
                                        ListObjectVersionsResponse.builder()
                                                .versions(version("old-b.png", 60, false))
                                                .build());
                            }
                            return versionsPaginator(
                                    ListObjectVersionsResponse.builder()
                                            .versions(version("old-private.pdf", 300, false))
                                            .deleteMarkers(deleteMarker("removed-private.pdf"))
                                            .build());
                        });
        when(s3Client.listMultipartUploadsPaginator(any(ListMultipartUploadsRequest.class)))
                .thenAnswer(
                        invocation -> {
                            ListMultipartUploadsRequest request = invocation.getArgument(0);
                            if (request.bucket().equals("public-assets")) {
                                return multipartPaginator(
                                        ListMultipartUploadsResponse.builder()
                                                .uploads(
                                                        multipart("workspaces/42/pending-a"),
                                                        multipart("workspaces/42/pending-b"),
                                                        multipart("workspaces/99/not-counted"))
                                                .build());
                            }
                            return multipartPaginator(
                                    ListMultipartUploadsResponse.builder()
                                            .uploads(multipart("workspaces/42/pending-private"))
                                            .build());
                        });

        PrefixInventory inventory = adapter.inspectPrefix("workspaces/42/");

        assertThat(inventory.totalObjectCount()).isEqualTo(2);
        assertThat(inventory.nonCurrentVersionCount()).isEqualTo(3);
        assertThat(inventory.nonCurrentVersionBytes()).isEqualTo(400);
        assertThat(inventory.deleteMarkerCount()).isEqualTo(2);
        assertThat(inventory.incompleteMultipartUploadCount()).isEqualTo(3);
        assertThat(inventory.totalPurgeCandidateCount()).isEqualTo(10);
        assertThat(inventory.totalStoredBytes()).isEqualTo(600);
        assertThat(inventory.toString())
                .doesNotContain("old-a", "removed-private", "pending-private");
    }

    @Test
    void rejectsBroadOrUnscopedPrefixBeforeCallingStorage() {
        assertThatThrownBy(() -> adapter.inspectPrefix("workspaces"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> adapter.inspectPrefix(""))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> adapter.inspectPrefix("/"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> adapter.inspectPrefix("workspaces/0/"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void refusesPurgeBeforeCallingStorageWhenFeatureFlagIsDisabled() {
        assertThatThrownBy(() -> adapter.purgePrefix("workspaces/42/"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("비활성화");

        verify(s3Client, never()).deleteObjects(any(DeleteObjectsRequest.class));
    }

    @Test
    void deletesVersionIdentifiersInProviderLimitBatchesAndVerifiesEmptyPrefix() {
        ReflectionTestUtils.setField(adapter, "workspacePurgeDeleteEnabled", true);
        List<ObjectVersion> versions =
                IntStream.range(0, 1001)
                        .mapToObj(
                                index ->
                                        ObjectVersion.builder()
                                                .key("workspaces/42/object-" + index)
                                                .versionId("version-" + index)
                                                .isLatest(index == 1000)
                                                .size(1L)
                                                .build())
                        .toList();
        AtomicInteger publicVersionCalls = new AtomicInteger();
        when(s3Client.listObjectVersionsPaginator(any(ListObjectVersionsRequest.class)))
                .thenAnswer(
                        invocation -> {
                            ListObjectVersionsRequest request = invocation.getArgument(0);
                            if (request.bucket().equals("public-assets")
                                    && publicVersionCalls.getAndIncrement() == 0) {
                                return versionsPaginator(
                                        ListObjectVersionsResponse.builder()
                                                .versions(versions)
                                                .build());
                            }
                            return versionsPaginator(ListObjectVersionsResponse.builder().build());
                        });
        when(s3Client.listObjectsV2Paginator(any(ListObjectsV2Request.class)))
                .thenAnswer(ignored -> paginator(ListObjectsV2Response.builder().build()));
        when(s3Client.deleteObjects(any(DeleteObjectsRequest.class)))
                .thenReturn(DeleteObjectsResponse.builder().build());

        PrefixInventory before = new PrefixInventory(1, 0, 1, 1000, 1000, 0, 0);
        assertThat(before.totalPurgeCandidateCount()).isEqualTo(1001);

        var result = adapter.purgePrefix("workspaces/42/");

        ArgumentCaptor<DeleteObjectsRequest> requests =
                ArgumentCaptor.forClass(DeleteObjectsRequest.class);
        verify(s3Client, times(2)).deleteObjects(requests.capture());
        assertThat(requests.getAllValues())
                .extracting(request -> request.delete().objects().size())
                .containsExactly(1000, 1);
        assertThat(result.deletedVersionOrMarkerCount()).isEqualTo(1001);
        assertThat(result.totalDeletedCandidateCount()).isEqualTo(1001);
        assertThat(result.toString()).doesNotContain("object-", "version-");
    }

    private ListObjectsV2Iterable paginator(ListObjectsV2Response... responses) {
        ListObjectsV2Iterable iterable = mock(ListObjectsV2Iterable.class);
        when(iterable.iterator()).thenReturn(List.of(responses).iterator());
        return iterable;
    }

    private ListObjectVersionsIterable versionsPaginator(ListObjectVersionsResponse... responses) {
        ListObjectVersionsIterable iterable = mock(ListObjectVersionsIterable.class);
        when(iterable.iterator()).thenReturn(List.of(responses).iterator());
        return iterable;
    }

    private ListMultipartUploadsIterable multipartPaginator(
            ListMultipartUploadsResponse... responses) {
        ListMultipartUploadsIterable iterable = mock(ListMultipartUploadsIterable.class);
        when(iterable.iterator()).thenReturn(List.of(responses).iterator());
        return iterable;
    }

    private ListObjectsV2Response response(S3Object... objects) {
        return ListObjectsV2Response.builder().contents(objects).build();
    }

    private S3Object object(String key, long size) {
        return S3Object.builder().key(key).size(size).build();
    }

    private ObjectVersion version(String key, long size, boolean latest) {
        return ObjectVersion.builder().key(key).size(size).isLatest(latest).build();
    }

    private DeleteMarkerEntry deleteMarker(String key) {
        return DeleteMarkerEntry.builder().key(key).isLatest(true).build();
    }

    private MultipartUpload multipart(String key) {
        return MultipartUpload.builder().key(key).uploadId("upload-id").build();
    }
}
