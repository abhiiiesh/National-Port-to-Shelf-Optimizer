# CI/CD Pipeline

Workflow file: `.github/workflows/ci-cd.yml`

## Stages

1. **test**
   - Install dependencies
   - Run test suite
   - Build all services

2. **docker-build**
   - Build Docker images for each service using `Dockerfile.service`
   - Tags include commit SHA

3. **deploy-staging**
   - Validate Kubernetes manifests via `kubectl --dry-run=client`
   - Apply manifests when `STAGING_KUBECONFIG_B64` secret is configured

4. **smoke-tests**
   - Run `scripts/smoke/smoke-test.sh`
   - Validate `/health` and auth enforcement behavior

## Required GitHub configuration

- **Secrets**
  - `STAGING_KUBECONFIG_B64`
- **Variables**
  - `STAGING_BASE_URL`

