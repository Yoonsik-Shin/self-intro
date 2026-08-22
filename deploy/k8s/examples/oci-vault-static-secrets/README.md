# OCI Vault static secret inventory

이 디렉터리는 평문을 출력하지 않고 정적 Secret 소비 경계와 이전 후보를 검증한다.

- `static-secret-inventory.json`: API/Worker Secret 소비자, 이전 후보, 회전·복구 방식
- `iam-user-policy.example.txt`: OKE Basic용 workload 최소 권한 예시
- `validate_inventory.py`: Deployment Secret 참조와 Git의 SealedSecret key 목록 정합성 검사

별도 stage overlay는 없다. 개발 기간에는 `main`이 production으로 직접 배포되므로 SMTP 전환 manifest는
`deploy/k8s/overlays/prod/backend`에 있다. production 적용 전 코드·image·Kustomize를 검증하고 한 Secret
그룹씩 전환한다.

```bash
python3 deploy/k8s/examples/oci-vault-static-secrets/validate_inventory.py
kubectl kustomize deploy/k8s/overlays/prod/backend
```

실제 Secret 값, SMTP/DB 자격 증명, OCI signing private key는 Git에 넣지 않는다. API signing key는
`oci-api-static-reader-bootstrap` SealedSecret으로 암호화되며 init container에만 mount한다. 상세 rollout,
회전, rollback, 비용 gate는 `docs/operations/oci-vault-static-secret-migration.md`를 따른다.
