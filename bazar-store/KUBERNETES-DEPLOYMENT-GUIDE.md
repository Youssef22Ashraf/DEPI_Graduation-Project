# Bazarcom Kubernetes Deployment Guide

This guide provides detailed instructions for deploying the Bazarcom application to Kubernetes. The application has been modified to address several issues that would prevent it from running properly in a Kubernetes environment.

## Changes Made to Make the Application Kubernetes-Ready

### 1. Fixed Hardcoded URLs

The application had several hardcoded URLs that would prevent proper service discovery in Kubernetes:

- **Core Service**: Updated to use environment variables for service URLs
  - Now reads `CATALOG_SERVICE_URL` and `ORDER_SERVICE_URL` from environment variables
  - Falls back to default values if not provided

- **JavaScript Files**: Updated to use dynamic service URLs
  - Modified `history.js` and `reports.js` to use environment-provided URLs instead of hardcoded localhost addresses
  - Added global variable sharing between JavaScript modules

### 2. Added Health Endpoints

- **Core Service**: Added a `/health` endpoint that:
  - Checks connectivity to dependent services (catalog and order)
  - Returns appropriate HTTP status codes (200 for healthy, 503 for unhealthy)
  - Provides detailed health information for each dependency

### 3. Environment Variable Configuration

- Updated services to properly read configuration from Kubernetes ConfigMaps
- Ensured consistent environment variable usage across all services

## Deployment Process

### Prerequisites

- Kubernetes cluster (Minikube, Docker Desktop, or a cloud provider)
- kubectl installed and configured
- Docker installed and configured with access to DockerHub
- PowerShell (for Windows) or Bash (for Linux/Mac)

### Step 1: Test with Docker Compose

Before deploying to Kubernetes, verify that the application works correctly with Docker Compose:

```powershell
./test-docker-compose.ps1
```

This script will:
- Build and start all services
- Verify that all containers are running
- Test the health endpoints
- Provide access instructions

### Step 2: Build and Push Docker Images

Build new Docker images with the `k8s-ready` tag and push them to DockerHub:

```powershell
./build-and-push.ps1
```

This script will:
- Build new images for catalog, order, and core services
- Tag them with `youssefashraf265/bazarcom-{service}:k8s-ready`
- Push the images to DockerHub

### Step 3: Update Kubernetes Manifests

Update the Kubernetes deployment files to use the new images:

```powershell
./update-k8s-manifests.ps1
```

This script will:
- Update image references in all deployment files
- Create deployment instructions

### Step 4: Deploy to Kubernetes

Deploy the application to Kubernetes:

```powershell
cd kubernetes/dev
./deploy.ps1
```

This will create:
- Namespace, ConfigMaps, and Secrets
- PostgreSQL database with persistent storage
- Catalog, Order, and Core services

### Step 5: Verify Deployment

Verify that all pods are running:

```bash
kubectl get pods -n dev
```

All pods should show `Running` status and be ready (e.g., `1/1`).

### Step 6: Access the Application

Create a port-forward to access the core service:

```bash
kubectl port-forward service/core-service 5005:5005 -n dev
```

Then open your browser and navigate to: http://localhost:5005

## Troubleshooting

### Common Issues and Solutions

1. **Pods not starting**
   - Check pod logs: `kubectl logs <pod-name> -n dev`
   - Verify ConfigMaps and Secrets are correctly created

2. **Services not connecting**
   - Verify service discovery: `kubectl get services -n dev`
   - Check environment variables in pods: `kubectl exec <pod-name> -n dev -- env | grep SERVICE`

3. **Database issues**
   - Check postgres pod logs: `kubectl logs postgres-<pod-id> -n dev`
   - Verify persistent volume: `kubectl get pv,pvc -n dev`

4. **JavaScript errors in browser**
   - Open browser developer console to check for connection errors
   - Verify that service URLs are correctly set

### Cleanup

To remove all resources:

```powershell
cd kubernetes/dev
./cleanup.ps1
```

## Architecture Overview

The Bazarcom application consists of the following components:

1. **PostgreSQL Database**: Stores book catalog and order information
2. **Catalog Service**: Manages the book inventory
3. **Order Service**: Handles purchase transactions
4. **Core Service**: Provides the web interface and coordinates between services

In Kubernetes, these components are deployed as separate pods with service discovery handled through Kubernetes Services.

## Next Steps

- Add Ingress for external access
- Implement proper TLS/SSL
- Set up monitoring with Prometheus and Grafana
- Configure horizontal pod autoscaling