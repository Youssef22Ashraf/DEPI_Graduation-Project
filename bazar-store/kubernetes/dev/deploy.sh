#!/bin/bash

# Bazarcom Kubernetes Deployment Script for Linux/macOS

# Create namespace and shared resources
echo "Creating namespace and shared resources..."
kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-configmap.yaml
kubectl apply -f 02-postgres-secret.yaml

# Deploy PostgreSQL
echo "Deploying PostgreSQL..."
kubectl apply -f postgres/postgres-deployment.yaml

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
while [[ $(kubectl get pods -n dev -l app=postgres -o 'jsonpath={..status.conditions[?(@.type=="Ready")].status}') != "True" ]]; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 5
done
echo "PostgreSQL is ready!"

# Deploy application services
echo "Deploying Catalog service..."
kubectl apply -f catalog/catalog-deployment.yaml

echo "Deploying Order service..."
kubectl apply -f order/order-deployment.yaml

echo "Deploying Core service..."
kubectl apply -f core/core-deployment.yaml

# Display status
echo -e "\nDeployment completed! Here's the status of your resources:\n"
kubectl get all -n dev

echo -e "\nTo access the application, run the following command:"
echo "kubectl port-forward -n dev service/core-service 5005:5005"
echo "Then open http://localhost:5005 in your browser."