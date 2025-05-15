# Production Deployment Guide

This guide will help you deploy the BazarStore application to your Kubernetes cluster in production mode.

## Prerequisites

- Kubernetes cluster up and running
- kubectl configured to communicate with your cluster
- Docker images pushed to registry (youssefashraf265/bazarcom-*)

## Deployment Steps

Follow these steps in order to ensure proper deployment:

### 1. Create the Production Namespace

```bash
kubectl apply -f namespace/prod_namespace.yaml
```

### 2. Apply ConfigMaps and Secrets

```bash
kubectl apply -f config/prod-configmap.yaml
kubectl apply -f secrets/secrets.yaml
```

### 3. Set Up PostgreSQL Storage

```bash
# Apply the PersistentVolume first
kubectl apply -f postgres/postgres-pv.yaml

# Then apply the PersistentVolumeClaim
kubectl apply -f postgres/postgres-pvc.yaml
```

### 4. Deploy PostgreSQL Database

```bash
kubectl apply -f postgres/postgres-dep.yaml
kubectl apply -f postgres/postgres-service.yaml
```

### 5. Deploy Microservices

```bash
# Deploy Catalog Service
kubectl apply -f catalog/catalog-dep.yaml
kubectl apply -f catalog/catalog-serivce.yaml

# Deploy Order Service
kubectl apply -f order/order-dep.yaml
kubectl apply -f order/order-service.yaml

# Deploy Core Service
kubectl apply -f core/core-dep.yaml
kubectl apply -f core/core-service.yaml
```

### 6. Deploy Ingress

```bash
kubectl apply -f ingress/ingress.yaml
```

## Verify Deployment

Check if all pods are running:

```bash
kubectl get pods -n bazarstore-prod
```

Check services:

```bash
kubectl get svc -n bazarstore-prod
```

Check persistent volumes:

```bash
kubectl get pv,pvc -n bazarstore-prod
```

## Troubleshooting

If pods are not starting, check the logs:

```bash
kubectl logs <pod-name> -n bazarstore-prod
```

Check events for issues:

```bash
kubectl get events -n bazarstore-prod
```