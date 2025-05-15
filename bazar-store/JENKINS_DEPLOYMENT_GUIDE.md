# Jenkins Deployment Guide for Bazarstore Production

This guide explains how to set up and use the Jenkins pipeline for automating the deployment of Bazarstore to the production Kubernetes environment.

## Prerequisites

1. Jenkins server installed and configured
2. Docker installed on Jenkins agent
3. kubectl installed on Jenkins agent
4. Access to a Docker registry (DockerHub, ECR, etc.)
5. Kubernetes cluster configured and accessible

## Jenkins Credentials Setup

Before running the pipeline, you need to configure the following credentials in Jenkins:

1. **Docker Registry Credentials**
   - ID: `docker-credentials-id` (update in Jenkinsfile)
   - Type: Username with password
   - Description: Docker registry credentials

2. **Kubernetes Config Credentials**
   - ID: `kubeconfig-credentials-id` (update in Jenkinsfile)
   - Type: Secret file
   - Description: Kubeconfig file for accessing the Kubernetes cluster

## Pipeline Configuration

The Jenkinsfile is configured to:

1. Build Docker images for all microservices
2. Push images to your Docker registry
3. Update Kubernetes manifests with new image tags
4. Deploy to production in the correct order:
   - Namespace
   - ConfigMaps and Secrets
   - Storage resources (PV/PVC)
   - Database (PostgreSQL)
   - Microservices (Catalog, Order, Core)
   - Ingress
5. Verify the deployment

## How to Use

### Setting Up the Pipeline in Jenkins

1. In Jenkins, create a new Pipeline job
2. Configure the Pipeline to use SCM
3. Specify your repository URL
4. Set the Script Path to `Jenkinsfile`
5. Save the configuration

### Customizing the Pipeline

Before running the pipeline, update the following variables in the Jenkinsfile:

```groovy
DOCKER_REGISTRY = 'your-docker-registry' // Replace with your Docker registry
DOCKER_CREDENTIALS_ID = 'docker-credentials-id' // Replace with your Jenkins credentials ID
KUBECONFIG_CREDENTIALS_ID = 'kubeconfig-credentials-id' // Replace with your Jenkins credentials ID
```

### Running the Pipeline

1. Trigger the pipeline manually or configure it to run on specific events (e.g., git push to main branch)
2. Monitor the pipeline execution in the Jenkins UI
3. Check the logs for any errors

## Troubleshooting

### Common Issues

1. **Docker Build Failures**
   - Check Dockerfile syntax
   - Ensure all required files are present

2. **Docker Push Failures**
   - Verify Docker registry credentials
   - Check network connectivity to the registry

3. **Kubernetes Deployment Failures**
   - Validate kubeconfig file
   - Check if namespace exists
   - Verify resource quotas and limits

### Viewing Logs

To view logs of deployed pods:

```bash
kubectl logs -n bazarstore-prod <pod-name>
```

## Pipeline Stages Explanation

1. **Checkout**: Retrieves the source code from the repository
2. **Build Docker Images**: Builds Docker images for all microservices in parallel
3. **Push Docker Images**: Pushes built images to the Docker registry
4. **Update Kubernetes Manifests**: Updates deployment files with new image tags
5. **Deploy to Kubernetes**: Applies Kubernetes manifests in the correct order
6. **Verify Deployment**: Checks if all deployments are successful

## Security Considerations

- Store sensitive information (passwords, API keys) in Jenkins credentials
- Use least privilege principle for Kubernetes RBAC
- Regularly update base Docker images to patch security vulnerabilities
- Consider implementing image scanning in the pipeline

## Extending the Pipeline

You can extend the pipeline by adding stages for:

- Automated testing
- Security scanning
- Performance testing
- Notifications (Slack, Email, etc.)
- Backup and rollback procedures