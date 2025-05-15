# Local Testing Guide for Bazarcom Application

## Changes Made for Local Testing

The following changes have been made to enable local testing of the application:

1. Changed service types from `ClusterIP` to `NodePort` for all services:
   - Core service: NodePort 30005
   - Catalog service: NodePort 30000
   - Order service: NodePort 30001

2. Fixed a typo in the core-deployment.yaml file (changed `Nodeport` to `NodePort`)

## Prerequisites

- Kubernetes cluster running locally (Minikube, Docker Desktop with Kubernetes, or Kind)
- kubectl CLI tool installed and configured
- Docker installed (for building images if needed)

## Testing Steps

### 1. Build and Push Docker Images (if needed)

If you need to build the images locally instead of using the pre-built ones:

```bash
# From the project root directory
cd catalog
docker build -t youssefashraf265/bazarcom-catalog:latest .

cd ../order
docker build -t youssefashraf265/bazarcom-order:latest .

cd ../core
docker build -t youssefashraf265/bazarcom-core:latest .
```

If using Minikube, you may need to use the Minikube Docker daemon:

```bash
eval $(minikube docker-env)  # For Linux/Mac
# or
minikube docker-env | Invoke-Expression  # For Windows PowerShell
```

### 2. Deploy the Application

Run the deployment script from the kubernetes/dev directory:

```bash
# For Windows
.\deploy.ps1

# For Linux/Mac
./deploy.sh
```

### 3. Access the Application

Once deployed, you can access the services at:

- Core service: http://localhost:30005
- Catalog service: http://localhost:30000
- Order service: http://localhost:30001

If you're using Minikube, you'll need to use the Minikube IP instead of localhost:

```bash
# Get Minikube IP
minikube ip

# Then access using
http://<minikube-ip>:30005  # For core service
http://<minikube-ip>:30000  # For catalog service
http://<minikube-ip>:30001  # For order service
```

### 4. Troubleshooting

#### Check Pod Status

```bash
kubectl get pods -n bazarstore-dev
```

#### View Pod Logs

```bash
kubectl logs -n bazarstore-dev <pod-name>
```

#### Check Services

```bash
kubectl get services -n bazarstore-dev
```

#### Port Forwarding (Alternative Access Method)

If NodePort doesn't work, you can try port forwarding:

```bash
kubectl port-forward -n bazarstore-dev service/core 5005:80
kubectl port-forward -n bazarstore-dev service/catalog 5000:5000
kubectl port-forward -n bazarstore-dev service/order 5001:5001
```

## Preparing for EKS Deployment

When you're ready to deploy to EKS, you'll need to:

1. Change the service types back to `LoadBalancer` for public-facing services
2. Configure proper AWS IAM roles and permissions
3. Set up an Ingress controller or AWS ALB Ingress Controller
4. Configure proper security groups

For EKS deployment, you'll need to modify the service types in the deployment YAML files:

```yaml
spec:
  selector:
    app: core
  ports:
  - port: 80
    targetPort: 5005
  type: LoadBalancer  # Change from NodePort to LoadBalancer
```

## Additional Notes

- The application uses a PostgreSQL database which is deployed as part of the Kubernetes setup
- Make sure your Kubernetes cluster has enough resources to run all the services
- For local testing, persistent volume claims will use the default storage class of your Kubernetes cluster