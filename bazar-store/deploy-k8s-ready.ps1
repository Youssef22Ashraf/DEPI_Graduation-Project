# Script to update Kubernetes YAML files and build/push Docker images

# Set the Docker Hub username
$DOCKER_USERNAME = "youssefashraf265"

# Set the new image tag
$IMAGE_TAG = "k8s-ready"

# Update Kubernetes YAML files
Write-Host "Updating Kubernetes YAML files..."

# Replace the old deployment files with the new ones
Copy-Item -Path "./kubernetes/dev/catalog/catalog-deployment-new.yaml" -Destination "./kubernetes/dev/catalog/catalog-deployment.yaml" -Force
Copy-Item -Path "./kubernetes/dev/order/order-deployment-new.yaml" -Destination "./kubernetes/dev/order/order-deployment.yaml" -Force
Copy-Item -Path "./kubernetes/dev/core/core-deployment-new.yaml" -Destination "./kubernetes/dev/core/core-deployment.yaml" -Force

Write-Host "Kubernetes YAML files updated successfully!"

# Build and push Docker images
Write-Host "Building and pushing Docker images..."

# Build and push the catalog service
Write-Host "Building catalog service image..."
docker build -t $DOCKER_USERNAME/bazarcom-catalog:$IMAGE_TAG ./catalog
Write-Host "Pushing catalog service image..."
docker push $DOCKER_USERNAME/bazarcom-catalog:$IMAGE_TAG

# Build and push the order service
Write-Host "Building order service image..."
docker build -t $DOCKER_USERNAME/bazarcom-order:$IMAGE_TAG ./order
Write-Host "Pushing order service image..."
docker push $DOCKER_USERNAME/bazarcom-order:$IMAGE_TAG

# Build and push the core service
Write-Host "Building core service image..."
docker build -t $DOCKER_USERNAME/bazarcom-core:$IMAGE_TAG ./core
Write-Host "Pushing core service image..."
docker push $DOCKER_USERNAME/bazarcom-core:$IMAGE_TAG

Write-Host "All images built and pushed successfully!"

# Instructions for deploying to Kubernetes
Write-Host "\nTo deploy to Kubernetes, run the following commands:\n"
Write-Host "cd kubernetes/dev"
Write-Host "./deploy.ps1"
Write-Host "\nAfter deployment, access the application with:\n"
Write-Host "kubectl port-forward -n dev service/core-service 5005:5005"
Write-Host "Then open http://localhost:5005 in your browser."