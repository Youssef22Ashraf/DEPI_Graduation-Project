# Bazarcom Kubernetes Deployment Guide

## Overview
This directory contains Kubernetes manifests for deploying the Bazarcom application in a development environment. The application consists of the following services:

- PostgreSQL database
- Catalog service
- Order service
- Core service

## Prerequisites
- Kubernetes cluster (local like Minikube, Docker Desktop, or Kind)
- kubectl command-line tool
- Docker (for building images if needed)

## Directory Structure
```
dev/
├── 00-namespace.yaml          # Namespace definition
├── 01-configmap.yaml          # ConfigMap with environment variables
├── 02-postgres-secret.yaml    # Secret for PostgreSQL credentials
├── postgres/                  # PostgreSQL database manifests
│   └── postgres-deployment.yaml
├── catalog/                   # Catalog service manifests
│   └── catalog-deployment.yaml
├── order/                     # Order service manifests
│   └── order-deployment.yaml
└── core/                      # Core service manifests
    └── core-deployment.yaml
```

## Deployment Instructions

### 1. Create the namespace and shared resources
```bash
kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-configmap.yaml
kubectl apply -f 02-postgres-secret.yaml
```

### 2. Deploy PostgreSQL
```bash
kubectl apply -f postgres/postgres-deployment.yaml
```

### 3. Deploy the application services
```bash
kubectl apply -f catalog/catalog-deployment.yaml
kubectl apply -f order/order-deployment.yaml
kubectl apply -f core/core-deployment.yaml
```

### 4. Verify the deployment
```bash
kubectl get all -n dev
```

## Accessing the Application
By default, the services are deployed with ClusterIP type, which means they are only accessible within the cluster. To access the application from outside the cluster, you can:

1. Use port-forwarding:
```bash
kubectl port-forward -n dev service/core-service 5005:5005
```
Then access the application at http://localhost:5005

2. Or modify the core-service to use NodePort or LoadBalancer type.

## Cleanup
To remove all resources created by this deployment:
```bash
kubectl delete namespace dev
```

## Notes for AWS EKS Deployment
For deploying to AWS EKS, you'll need to:

1. Create an EKS cluster using AWS Management Console or eksctl
2. Configure kubectl to use your EKS cluster
3. Consider using AWS services like RDS for PostgreSQL instead of deploying it in the cluster
4. Use AWS ECR for storing your Docker images
5. Configure IAM roles and policies for your EKS cluster
6. Consider using AWS Load Balancer Controller for exposing services

Detailed EKS deployment instructions will be provided in a separate guide.