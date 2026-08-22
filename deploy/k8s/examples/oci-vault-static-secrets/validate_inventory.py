#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
INVENTORY = Path(__file__).with_name("static-secret-inventory.json")
WORKLOADS = {
    "api": ROOT / "deploy/k8s/base/backend/deployment.yaml",
    "worker": ROOT / "deploy/k8s/base/backend/deployment-worker.yaml",
}


def referenced_secrets(path: Path) -> set[str]:
    text = path.read_text()
    refs = set(re.findall(r"secretRef:\s*\n\s+name:\s*([^\s#]+)", text))
    refs.update(re.findall(r"secretKeyRef:\s*\n\s+name:\s*([^\s#]+)", text))
    refs.update(re.findall(r"secretName:\s*([^\s#]+)", text))
    return refs


def encrypted_keys(path: Path) -> set[str]:
    text = path.read_text()
    match = re.search(r"\n\s*encryptedData:\s*\n(?P<body>.*?)(?=\n\s*template:)", text, re.DOTALL)
    if not match:
        raise ValueError(f"encryptedData block not found: {path}")
    return set(re.findall(r"^\s+([A-Z][A-Z0-9_]*):", match.group("body"), re.MULTILINE))


def main() -> int:
    data = json.loads(INVENTORY.read_text())
    errors: list[str] = []
    groups = {group["kubernetesSecret"]: group for group in data["groups"]}

    for consumer, deployment in WORKLOADS.items():
        for name in referenced_secrets(deployment):
            group = groups.get(name)
            if group is None:
                errors.append(f"{consumer}: missing inventory group {name}")
            elif consumer not in group["consumers"]:
                errors.append(f"{consumer}: {name} does not declare this consumer")

    targets: set[str] = set()
    migrating = 0
    for name, group in groups.items():
        source = group.get("sourceManifest")
        item_keys = {item["key"] for item in group["items"]}
        if source:
            actual = encrypted_keys(ROOT / source)
            if actual != item_keys:
                errors.append(f"{name}: inventory keys differ from encryptedData keys")
        for item in group["items"]:
            if not item.get("migrate"):
                continue
            migrating += 1
            for required in ("targetOciSecretName", "rotationMode", "rollback"):
                if not item.get(required):
                    errors.append(f"{name}/{item['key']}: missing {required}")
            target = item.get("targetOciSecretName")
            if target in targets:
                errors.append(f"duplicate target OCI Secret name: {target}")
            targets.add(target)

    allowed_rollout_states = {
        "DESIGN_ONLY": False,
        "PROD_SMTP_ROLLOUT_PREPARED": False,
        "PROD_SMTP_APPLIED": True,
    }
    status = data.get("status")
    if status not in allowed_rollout_states:
        errors.append(f"unsupported rollout status: {status}")
    elif data.get("applied") is not allowed_rollout_states[status]:
        errors.append(
            f"rollout status {status} requires applied={allowed_rollout_states[status]}"
        )
    if data.get("syncToKubernetesSecret") is not False:
        errors.append("target must not sync plaintext back to a Kubernetes Secret")
    if data.get("okeTier") != "BASIC_CLUSTER" or data.get("usesEnhancedOke") is not False:
        errors.append("low-cost design must remain on OKE BASIC_CLUSTER")
    if data.get("usesCsiDriver") is not False:
        errors.append("low-cost design must not install a CSI node DaemonSet")
    if data.get("targetTransport") != "oci-iam-user-init-container-memory-file-mount":
        errors.append("unexpected static secret transport")

    if errors:
        print("static-secret inventory validation failed", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(
        "static-secret inventory valid: "
        f"{len(groups)} groups, {migrating} migration candidates, "
        f"{len(WORKLOADS)} workload consumers"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
