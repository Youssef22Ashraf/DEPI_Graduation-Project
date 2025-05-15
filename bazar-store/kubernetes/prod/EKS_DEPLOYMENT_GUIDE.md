# EKS Deployment Guide for Bazarstore Application

## Overview
This guide provides instructions for deploying the Bazarstore application to Amazon EKS (Elastic Kubernetes Service).

## Prerequisites
- AWS CLI installed and configured
- kubectl installed and configured
- eksctl installed
- Docker installed (for building and pushing images)

## Environment Variables
The following environment variables should be set in your CI/CD pipeline or deployment process:

```bash
# Database credentials (base64 encoded)
export DB_USERNAME_BASE64=$(echo -n "your-db-username" | base64)
export DB_PASSWORD_BASE64=$(echo -n "your-db-password" | base64)

# Database connection parameters
export DB_USER="your-db-username"
export DB_PASSWORD="your-db-password"
export DB_HOST="postgres"
export DB_PORT="5432"
export DB_NAME="bazarcom"

# Application domain
export APP_DOMAIN="prod.bazarstore.com"
```

## Deployment Steps

### 1. Create EKS Cluster
```bash
eksctl create cluster \
  --name bazarstore-cluster \
  --region us-east-1 \
  --version 1.24 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 4 \
  --managed
```

### 2. Configure kubectl
```bash
aws eks update-kubeconfig --name bazarstore-cluster --region us-east-1
```

### 3. Install NGINX Ingress Controller
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.5.1/deploy/static/provider/aws/deploy.yaml
```

### 4. Apply Kubernetes Manifests

Apply the manifests in the following order:

```bash
# Create namespace first
kubectl apply -f namespace/prod_namespace.yaml

# Apply ConfigMap and Secrets
envsubst < config/prod-configmap.yaml | kubectl apply -f -
envsubst < secrets/secrets.yaml | kubectl apply -f -

# Apply PVC for PostgreSQL
kubectl apply -f postgres/postgres-pvc.yaml

# Deploy PostgreSQL
kubectl apply -f postgres/postgres-dep.yaml
kubectl apply -f postgres/postgres-service.yaml

# Deploy microservices
kubectl apply -f catalog/catalog-dep.yaml
kubectl apply -f catalog/catalog-serivce.yaml
kubectl apply -f order/order-dep.yaml
kubectl apply -f order/order-service.yaml
kubectl apply -f core/core-dep.yaml
kubectl apply -f core/core-service.yaml

# Apply Ingress last
envsubst < ingress/ingress.yaml | kubectl apply -f -
```

### 5. Verify Deployment
```bash
# Check all resources in the namespace
kubectl get all -n bazarstore-prod

# Check ingress status
kubectl get ingress -n bazarstore-prod
```

## Important Notes

1. **Storage**: The PostgreSQL deployment uses a PersistentVolumeClaim. In EKS, this will automatically provision an EBS volume. For production, consider using Amazon RDS instead.

2. **Secrets Management**: For production, use AWS Secrets Manager or another secure secrets management solution instead of Kubernetes Secrets.

3. **Load Balancer**: The core service is exposed as a LoadBalancer, which will provision an AWS ELB. The URL will be available in the service status.

4. **DNS Configuration**: After deployment, get the Load Balancer address and configure your DNS to point your domain to it.

5. **SSL/TLS**: For HTTPS, configure a certificate using AWS Certificate Manager and update the ingress annotations.

## Troubleshooting

- **Pod Status**: `kubectl get pods -n bazarstore-prod`
- **Pod Logs**: `kubectl logs -n bazarstore-prod <pod-name>`
- **Service Details**: `kubectl describe service -n bazarstore-prod <service-name>`
- **Ingress Details**: `kubectl describe ingress -n bazarstore-prod`

## Cleanup

To delete the EKS cluster and all resources:

```bash
eksctl delete cluster --name bazarstore-cluster --region us-east-1
```