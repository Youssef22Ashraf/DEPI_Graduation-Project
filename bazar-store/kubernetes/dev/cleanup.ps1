# Bazarcom Kubernetes Cleanup Script for Windows

Write-Host "Cleaning up all Bazarcom resources in the dev namespace..."

# Delete all resources in reverse order
Write-Host "Deleting Core service..."
kubectl delete -f core/core-deployment.yaml --ignore-not-found

Write-Host "Deleting Order service..."
kubectl delete -f order/order-deployment.yaml --ignore-not-found

Write-Host "Deleting Catalog service..."
kubectl delete -f catalog/catalog-deployment.yaml --ignore-not-found

Write-Host "Deleting PostgreSQL..."
kubectl delete -f postgres/postgres-deployment.yaml --ignore-not-found

# Delete shared resources
Write-Host "Deleting shared resources..."
kubectl delete -f 02-postgres-secret.yaml --ignore-not-found
kubectl delete -f 01-configmap.yaml --ignore-not-found

# Finally delete the namespace
Write-Host "Deleting namespace..."
kubectl delete -f 00-namespace.yaml --ignore-not-found

Write-Host "Cleanup completed!"