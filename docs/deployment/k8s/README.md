# Kubernetes Deployment

This folder contains baseline Kubernetes manifests for all services.

## Layout

- `base/namespace.yaml` - namespace definition
- `base/configmap.yaml` - shared runtime configuration
- `base/services.yaml` - deployments + services for all platform services
- `base/ingress.yaml` - ingress for API Gateway
- `hpa/hpa.yaml` - horizontal pod autoscaling rules

## Apply

```bash
kubectl apply -f docs/deployment/k8s/base/namespace.yaml
kubectl apply -f docs/deployment/k8s/base/configmap.yaml
kubectl apply -f docs/deployment/k8s/base/services.yaml
kubectl apply -f docs/deployment/k8s/base/ingress.yaml
kubectl apply -f docs/deployment/k8s/hpa/hpa.yaml
```

## Image strategy

Update each deployment image tag from `latest` to your CI-generated immutable SHA tag before production rollout.

## Service discovery and scaling

Kubernetes Services provide internal DNS-based discovery (e.g., `http://authentication:3005`).
HPA rules are configured per service to enable CPU-based autoscaling.
