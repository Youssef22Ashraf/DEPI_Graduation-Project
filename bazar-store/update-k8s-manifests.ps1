# Script to update Kubernetes manifests for Bazarcom application

# Set the Docker Hub username and image tag
$DOCKER_USERNAME = "youssefashraf265"
$IMAGE_TAG = "k8s-ready"

# Function to update image in deployment files
function Update-DeploymentImage {
    param (
        [string]$FilePath,
        [string]$ServiceName
    )
    
    if (Test-Path $FilePath) {
        Write-Host "Updating $ServiceName deployment..."
        $content = Get-Content -Path $FilePath -Raw
        
        # Update the image tag
        $pattern = "image:\s*$DOCKER_USERNAME/bazarcom-$ServiceName:latest"
        $replacement = "image: $DOCKER_USERNAME/bazarcom-$ServiceName:$IMAGE_TAG"
        $content = $content -replace $pattern, $replacement
        
        # Write the updated content back to the file
        Set-Content -Path $FilePath -Value $content
        Write-Host "Updated $ServiceName deployment successfully."
    } else {
        Write-Host "Warning: $FilePath not found. Skipping..."
    }
}

# Update the deployment files
Update-DeploymentImage -FilePath "./kubernetes/dev/catalog/catalog-deployment.yaml" -ServiceName "catalog"
Update-DeploymentImage -FilePath "./kubernetes/dev/order/order-deployment.yaml" -ServiceName "order"
Update-DeploymentImage -FilePath "./kubernetes/dev/core/core-deployment.yaml" -ServiceName "core"

Write-Host "All deployment files updated successfully!"
Write-Host "You can now deploy to Kubernetes using the following commands:"
Write-Host "cd kubernetes/dev"
Write-Host "./deploy.ps1"

# Create a README file with instructions
$readmePath = "./kubernetes/KUBERNETES-DEPLOYMENT.md"
Write-Host "Creating deployment instructions at $readmePath..."

$readmeContent = @"
# Bazarcom Kubernetes Deployment Guide

## Prerequisites

- Kubernetes cluster (Minikube, Docker Desktop, or a cloud provider)
- kubectl installed and configured
- Docker installed

## Deployment Steps

1. **Build and push Docker images**

   Run the build-and-push script from the project root:

   ```powershell
   ./build-and-push.ps1
   ```

2. **Update Kubernetes manifests**

   Run the update script from the project root:

   ```powershell
   ./update-k8s-manifests.ps1
   ```

3. **Deploy to Kubernetes**

   Navigate to the kubernetes/dev directory and run the deployment script:

   ```powershell
   cd kubernetes/dev
   ./deploy.ps1
   ```

4. **Verify deployment**

   Check that all pods are running:

   ```bash
   kubectl get pods -n dev
   ```

5. **Access the application**

   Create a port-forward to access the core service:

   ```bash
   kubectl port-forward service/core-service 5005:5005 -n dev
   ```

   Then open your browser and navigate to: http://localhost:5005

## Troubleshooting

- **Pods not starting**: Check pod logs with `kubectl logs <pod-name> -n dev`
- **Services not connecting**: Verify service discovery with `kubectl get services -n dev`
- **Database issues**: Check postgres pod logs and ensure the persistent volume is working

## Known Issues and Fixes

1. **JavaScript hardcoded URLs**: The application has been updated to use environment variables for service URLs
2. **Health checks**: Health endpoints have been added to all services
3. **Environment variables**: All services now properly read environment variables from ConfigMaps

## Cleanup

To remove all resources:

```powershell
cd kubernetes/dev
./cleanup.ps1
```

"@

Set-Content -Path $readmePath -Value $readmeContent
Write-Host "Deployment instructions created successfully!"