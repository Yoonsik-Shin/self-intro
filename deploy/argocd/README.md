# Argo CD deployment

`deploy/k8s/base` contains reusable Kubernetes resources. Environment-specific
configuration and image versions live under `deploy/k8s/overlays`.

Before creating the Argo CD application:

1. Replace `REPLACE_WITH_GIT_REPOSITORY_URL` in
   `applications/backend-prod.yaml` with the repository URL.
2. Keep `ocir-pull-secret` and database credentials out of Git. The current
   pull secret is created directly in the `self-intro` namespace.
3. Render and validate the production overlay with:

   ```shell
   kubectl kustomize deploy/k8s/overlays/prod/backend
   ```

4. Apply the overlay directly until Argo CD is installed:

   ```shell
   kubectl apply -k deploy/k8s/overlays/prod/backend
   ```

When a new backend image is pushed, update only `newTag` (or use an immutable
digest) in `deploy/k8s/overlays/prod/backend/kustomization.yaml` and commit it.
Argo CD will then detect the Git change and synchronize the Deployment.

## Exposing the Argo CD dashboard

`ingress.yaml` exposes `argocd-server` at `https://argocd.unbrdn.me`, proxied
through Cloudflare exactly like `api.unbrdn.me` (orange cloud / Proxied).
There is no IP allowlist — access control is left to Argo CD's own
login (username/password).

Manual, one-time steps (not committed to Git):

1. In Cloudflare DNS, add an `argocd` A record pointing at the same origin LB
   as `api.unbrdn.me`, with the proxy status set to **Proxied**.
2. Copy the existing wildcard origin cert into the `argocd` namespace (the
   secret is namespace-scoped and already covers `*.unbrdn.me`):

   ```shell
   kubectl get secret cloudflare-origin-tls -n self-intro -o yaml \
     | sed 's/namespace: self-intro/namespace: argocd/' \
     | kubectl apply -f -
   ```

3. Apply the ingress (no Argo CD Application watches `deploy/argocd`, so this
   is manual):

   ```shell
   kubectl apply -k deploy/argocd
   ```
