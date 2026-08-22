# 2026-08-22 보안 강화 예상 비용

- 기준일: 2026-08-22
- 통화: OCI 공개 가격표의 USD, 부가세·환율·계약 할인 제외
- 원칙: 실제 유료 리소스 생성과 retention lock은 사용자 승인 후 수행한다.

## 비용이 없는 현재 작업

| 작업 | 직접 OCI 추가 비용 | 운영 영향 |
| --- | ---: | --- |
| Argon2id 신규 저장·BCrypt 점진 재해시 | $0 | 기존 API Pod의 로그인 CPU·메모리 소폭 증가 |
| Pod seccomp·non-root·capability 제거 | $0 | 기존 OKE compute 안에서 동작 |
| Kubernetes ingress NetworkPolicy | $0 | 기존 CNI 기능 사용 |

## 남은 보안 항목별 예상 비용

| 항목 | 권장 구성 | 예상 비용 | 승인 필요 이유 |
| --- | --- | ---: | --- |
| Workspace DEK | 기존 OCI Vault와 software-protected key 재사용 | 고정비 $0 예상 | 데이터 migration·회전·복구 rehearsal 필요 |
| 내부 mTLS | OCI Certificates 또는 cluster 내부 인증서 자동화 | OCI Certificates 서비스 $0 | 인증서 발급자·rotation 방식 확정 필요 |
| WORM 감사 | 별도 Object Storage bucket, lock 전 14일 검증 | Standard $0.0334203/GB-month + 요청 $0.00445604/10,000건 | 보존량만큼 누적되고 lock 뒤 단축·삭제가 제한됨 |
| Email·감사 모니터링 보강 | OCI Logging 선택 사용 | $0.05/GB stored-month | 수집량과 개인정보 비포함 filter 확정 필요 |
| egress 통제 | 현재 NetworkPolicy 유지 후 검증된 proxy/FQDN policy 선택 | 구성에 따라 $0 이상 | 새 gateway·proxy를 만들면 compute/network 비용 가능 |

예를 들어 WORM 감사 이벤트가 월 1 GB, Object Storage API 요청이 월 100,000건이면 공개 단가 기준
월 약 `$0.078`이다. 월 10 GB와 1,000,000건이면 월 약 `$0.78`이다. 실제 청구액은 보존으로 누적된 총
용량, outbound, 리전과 계정 계약에 따라 달라지므로 생성 직전 OCI Cost Estimator에서 다시 확인한다.

Private Vault와 Dedicated KMS는 현재 규모에 필요하지 않다. 공개 가격표의 Private Vault 시간당 요금이나
Dedicated KMS 최소 파티션 비용을 피하고, 기존 virtual vault와 software-protected key를 우선한다.

## 비용 승인 순서

1. Workspace DEK와 내부 mTLS는 기존 리소스 재사용 설계를 먼저 구현·부하 시험한다.
2. WORM은 일반 test bucket에서 최소 14일 보존·복구·조회 검증을 한다.
3. 월 이벤트 예상량과 실제 Object Storage 비용을 사용자에게 다시 보고한다.
4. 사용자가 승인한 뒤에만 production bucket retention rule을 만들고 lock한다.
5. egress proxy나 별도 gateway가 필요하면 월 고정비를 별도 견적 후 승인받는다.

## 공식 가격 확인

- OCI Certificates: <https://www.oracle.com/security/cloud-security/ssl-tls-certificates/>
- OCI Vault/Key Management: <https://www.oracle.com/security/cloud-security/key-management/>
- OCI IaaS/PaaS 가격: <https://www.oracle.com/cloud/iaas-paas/>
- OCI Object Storage 과금 기준: <https://docs.oracle.com/en-us/iaas/Content/Object/Concepts/objectstorageoverview.htm>
- OCI Logging FAQ: <https://www.oracle.com/europe/application-development/logging/faq/>

이 문서는 예산 추정이며 실제 OCI invoice나 계약 견적을 대체하지 않는다.
