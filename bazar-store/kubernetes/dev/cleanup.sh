#!/bin/bash

# Bazarcom Kubernetes Cleanup Script for Linux/macOS

echo "Cleaning up all Bazarcom resources in the dev namespace..."

# Delete all resources in reverse order
echo "Deleting Core service..."
kubectl delete -f core/core-deployment.yaml --ignore-not-found

echo "Deleting Order service..."
kubectl delete -f order/order-deployment.yaml --ignore-not-found

echo "Deleting Catalog service..."
kubectl delete -f catalog/catalog-deployment.yaml --ignore-not-found

echo "Deleting PostgreSQL..."
kubectl delete -f postgres/postgres-deployment.yaml --ignore-not-found

# Delete shared resources
echo "Deleting shared resources..."
kubectl delete -f 02-postgres-secret.yaml --ignore-not-found
kubectl delete -f 01-configmap.yaml --ignore-not-found

# Finally delete the namespace
echo "Deleting namespace..."
kubectl delete -f 00-namespace.yaml --ignore-not-found

echo "Cleanup completed!"