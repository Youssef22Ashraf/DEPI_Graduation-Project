# Script to build and push Docker images for Bazarcom application

# Set the Docker Hub username
$DOCKER_USERNAME = "youssefashraf265"

# Set the new image tag
$IMAGE_TAG = "k8s-ready"

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
Write-Host "You can now deploy to Kubernetes using the k8s-ready tag."