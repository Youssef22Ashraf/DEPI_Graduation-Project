# Bazarcom Kubernetes Deployment Script for Windows

# Create namespace and shared resources
Write-Host "Creating namespace and shared resources..."
kubectl apply -f namespace/namespace.yaml
kubectl apply -f config/configmap.yaml
kubectl apply -f secrets/secrets.yaml

# Deploy PostgreSQL
Write-Host "Deploying PostgreSQL..."
kubectl apply -f postgres/postgres-deployment.yaml

# Wait for PostgreSQL to be ready
Write-Host "Waiting for PostgreSQL to be ready..."
$ready = $false
while (-not $ready) {
    $status = kubectl get pods -n dev -l app=postgres -o jsonpath="{.items[0].status.containerStatuses[0].ready}"
    if ($status -eq "true") {
        $ready = $true
        Write-Host "PostgreSQL is ready!"
    } else {
        Write-Host "Waiting for PostgreSQL to be ready..."
        Start-Sleep -Seconds 5
    }
}

# Deploy application services
Write-Host "Deploying Catalog service..."
kubectl apply -f catalog/catalog-deployment.yaml

Write-Host "Deploying Order service..."
kubectl apply -f order/order-deployment.yaml

Write-Host "Deploying Core service..."
kubectl apply -f core/core-deployment.yaml

# Display status
Write-Host "\nDeployment completed! Here's the status of your resources:\n"
kubectl get all -n dev

Write-Host "\nTo access the application locally via NodePort:"
Write-Host "Core service: http://localhost:30005"
Write-Host "Catalog service: http://localhost:30000"
Write-Host "Order service: http://localhost:30001"
Write-Host "\nNote: Make sure your Kubernetes cluster is running and properly configured for local access."