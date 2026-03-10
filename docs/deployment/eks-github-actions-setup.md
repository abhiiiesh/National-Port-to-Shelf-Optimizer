# EKS + GitHub Actions Staging Setup

This guide follows your requested Step 1 → Step 8 flow for staging on EKS.

## Environment values for this project

- `AWS_REGION`: `us-west-2` (US West / Oregon)
- `EKS_CLUSTER_NAME`: `my-staging-cluster`
- `STAGING_BASE_URL`: set this **after** first successful deploy by using ingress/service external endpoint.

---

## Step 1 — Install kubectl

```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
kubectl version --client
```

## Step 2 — Install AWS CLI

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version
```

## Step 3 — Connect kubectl to your EKS cluster

```bash
aws configure
aws eks update-kubeconfig --region us-west-2 --name my-staging-cluster
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

```bash
kubectl -n port-to-shelf get ingress -o wide
kubectl -n port-to-shelf get svc api-gateway -o wide
```

Take the external DNS/IP and set repository variable `STAGING_BASE_URL` (for smoke tests).

## Step 6 — Generate kubeconfig secret for GitHub (fallback path)

```bash
cat ~/.kube/config | base64 -w 0
```

Save as GitHub Secret: `STAGING_KUBECONFIG_B64`.

## Step 7 — Add GitHub Variables and Secrets

Repository → **Settings** → **Secrets and variables** → **Actions**.

### Variables

- `AWS_REGION=us-west-2`
- `EKS_CLUSTER_NAME=my-staging-cluster`
- `STAGING_BASE_URL=<external endpoint from Step 5>`

### Secrets (preferred auth path)

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Optional fallback secret

- `STAGING_KUBECONFIG_B64`

## Step 8 — Deploy from GitHub Actions

Push to `main` (or run workflow_dispatch).

The deploy job now supports two auth modes:

1. **Preferred**: AWS credentials → `aws eks update-kubeconfig`
2. **Fallback**: `STAGING_KUBECONFIG_B64`

Then it:

- validates manifests
- applies manifests
- verifies rollout status for all deployments
- prints ingress/service endpoint hints for setting `STAGING_BASE_URL`

---

## IAM + RBAC confirmation checklist

To allow deployment principal access:

1. Run:

```bash
aws eks update-kubeconfig --region us-west-2 --name my-staging-cluster
```

2. Ensure the IAM principal is mapped/authorized for Kubernetes API access (via EKS access entries or `aws-auth` ConfigMap):

```bash
kubectl edit configmap aws-auth -n kube-system
```

3. Confirm principal can apply manifests in namespace:

```bash
kubectl auth can-i apply deployments -n port-to-shelf
kubectl auth can-i apply services -n port-to-shelf
kubectl auth can-i apply configmaps -n port-to-shelf
```

## Troubleshooting: AWS credentials valid but `kubectl` says credentials required

If logs show successful `aws sts get-caller-identity` but `kubectl get nodes` fails with:

- `the server has asked for the client to provide credentials`

then IAM authentication to EKS is not mapped for Kubernetes access.

Use one of:

1. Add EKS access entry + policy for the IAM principal used in GitHub Actions.
2. Provide `STAGING_KUBECONFIG_B64` fallback secret built from an already-authorized kubeconfig.

Example access-entry commands (run with admin principal):

```bash
aws eks create-access-entry   --cluster-name my-staging-cluster   --principal-arn <IAM_PRINCIPAL_ARN>   --type STANDARD   --region us-west-2

aws eks associate-access-policy   --cluster-name my-staging-cluster   --principal-arn <IAM_PRINCIPAL_ARN>   --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy   --access-scope type=cluster   --region us-west-2
```
