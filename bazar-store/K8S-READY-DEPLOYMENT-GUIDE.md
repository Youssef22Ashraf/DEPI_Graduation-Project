# Bazarcom Kubernetes-Ready Deployment Guide

This guide provides step-by-step instructions for deploying the Kubernetes-ready version of the Bazarcom application. The application has been modified to address several issues that would prevent it from running properly in a Kubernetes environment.

## Deployment Process Overview

The deployment process consists of the following steps:

1. Update Kubernetes YAML files
2. Build and push Docker images
3. Deploy to Kubernetes
4. Access the application

## Step 1: Update Kubernetes YAML Files and Build/Push Docker Images

The `deploy-k8s-ready.ps1` script has been executed successfully. This script performed the following actions:

- Replaced the old deployment files with new ones that don't use init containers
  - Updated `catalog-deployment.yaml`
  - Updated `order-deployment.yaml`
  - Updated `core-deployment.yaml`
- Built Docker images for all services with the `k8s-ready` tag
- Pushed the images to DockerHub under the `youssefashraf265` account

## Step 2: Deploy to Kubernetes

Now that the Kubernetes YAML files have been updated and the Docker images have been built and pushed, you can deploy the application to Kubernetes by following these steps:

```powershell
# Navigate to the kubernetes/dev directory
cd kubernetes/dev

# Run the deployment script
./deploy.ps1
```

The `deploy.ps1` script will:

1. Create the necessary namespace and shared resources
2. Deploy PostgreSQL and wait for it to be ready
3. Deploy the Catalog, Order, and Core services
4. Display the status of all deployed resources

## Step 3: Access the Application

After the deployment is complete, you can access the application by forwarding the port of the Core service:

```powershell
kubectl port-forward -n dev service/core-service 5005:5005
```

Then open http://localhost:5005 in your browser.

## Troubleshooting

If you encounter any issues during deployment, check the following:

1. Ensure all pods are running:
   ```powershell
   kubectl get pods -n dev
   ```

2. Check the logs of a specific pod:
   ```powershell
   kubectl logs -n dev <pod-name>
   ```

3. Verify the services are properly exposed:
   ```powershell
   kubectl get services -n dev
   ```

4. Check the ConfigMaps and Secrets:
   ```powershell
   kubectl get configmaps -n dev
   kubectl get secrets -n dev
   ```

## Kubernetes Modifications

The application has been modified to be Kubernetes-ready with the following changes:

1. **Service Discovery**: Updated to use environment variables for service URLs instead of hardcoded localhost addresses
2. **Health Endpoints**: Added health endpoints to all services for Kubernetes readiness and liveness probes
3. **Environment Configuration**: Updated services to properly read configuration from Kubernetes ConfigMaps
4. **Deployment Files**: Updated deployment files to use the `k8s-ready` tagged images

## Next Steps

After successful deployment, consider the following next steps:

1. Set up proper ingress for production environments
2. Configure persistent storage for PostgreSQL
3. Implement CI/CD pipelines for automated deployments
4. Set up monitoring and logging solutions