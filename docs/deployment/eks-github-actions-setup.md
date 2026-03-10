# EKS + GitHub Actions Staging Setup

This guide maps exactly to your requested sequence (Step 1 to Step 8) and aligns with `.github/workflows/ci-cd.yml`.

## Prerequisites

- EKS cluster already created (your Step 0 done).
- AWS IAM user/role with permissions for:
  - `eks:DescribeCluster`
  - `eks:ListClusters`
  - `eks:AccessKubernetesApi`
  - cluster RBAC permissions to deploy manifests in `port-to-shelf` namespace.

---

## Step 1 — Install kubectl (local machine)

```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
kubectl version --client
```

## Step 2 — Install AWS CLI (local machine)

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version
```

## Step 3 — Connect kubectl to your EKS cluster

```bash
aws configure
aws eks update-kubeconfig --region <AWS_REGION> --name <EKS_CLUSTER_NAME>
kubectl get nodes
```

## Step 4 — Deploy application

```bash
kubectl apply -f docs/deployment/k8s/base/namespace.yaml
kubectl apply -f docs/deployment/k8s/base/configmap.yaml
kubectl apply -f docs/deployment/k8s/base/services.yaml
kubectl apply -f docs/deployment/k8s/base/ingress.yaml
kubectl apply -f docs/deployment/k8s/hpa/hpa.yaml
```

## Step 5 — Expose the service

Current ingress manifest exposes API Gateway. Verify:

```bash
kubectl -n port-to-shelf get ingress
kubectl -n port-to-shelf get svc api-gateway
```

If AWS Load Balancer Controller is installed, `EXTERNAL-IP`/hostname will populate after a few minutes.

## Step 6 — Generate kubeconfig secret for GitHub (optional fallback)

If you choose kubeconfig-based auth instead of AWS credentials in Actions:

```bash
cat ~/.kube/config | base64 -w 0
```

Store output as GitHub secret `STAGING_KUBECONFIG_B64`.

## Step 7 — Add GitHub Variables/Secrets

Repository settings → Secrets and variables → Actions:

### Required variables

- `AWS_REGION`
- `EKS_CLUSTER_NAME`
- `STAGING_BASE_URL` (for smoke tests)

### Required secrets

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Optional secret

- `STAGING_KUBECONFIG_B64` (fallback only)

## Step 8 — Deploy from GitHub Actions

1. Push to `main` (or trigger `workflow_dispatch`).
2. The `deploy-staging` job now does:
   - install kubectl
   - install AWS CLI
   - configure AWS credentials
   - run `aws eks update-kubeconfig`
   - validate/apply manifests
   - verify rollout status
3. `smoke-tests` job runs after deploy using `scripts/smoke/smoke-test.sh`.

---

## What I need from your side

To complete the connection in your GitHub repo, please provide/configure:

1. `AWS_REGION` value.
2. `EKS_CLUSTER_NAME` value.
3. `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets (or tell me if you want role-based OIDC instead).
4. `STAGING_BASE_URL` variable for smoke checks.
5. Confirm that your IAM principal is authorized in EKS (`aws-auth` / access entries) to perform `kubectl apply`.

Once these are set, pushing to `main` will deploy to your EKS staging cluster automatically.
