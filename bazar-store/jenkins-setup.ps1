# Jenkins Setup Helper Script for Bazarstore Production Deployment
# This script helps prepare and validate the environment for Jenkins pipeline execution

# Set error action preference
$ErrorActionPreference = "Stop"

# Function to check if a command exists
function Test-CommandExists {
    param ($command)
    $exists = $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
    return $exists
}

# Check for required tools
Write-Host "\nChecking for required tools..." -ForegroundColor Cyan

$requiredTools = @("docker", "kubectl")
$missingTools = @()

foreach ($tool in $requiredTools) {
    if (Test-CommandExists $tool) {
        Write-Host "✓ $tool is installed" -ForegroundColor Green
    } else {
        Write-Host "✗ $tool is not installed" -ForegroundColor Red
        $missingTools += $tool
    }
}

if ($missingTools.Count -gt 0) {
    Write-Host "\nPlease install the missing tools before proceeding." -ForegroundColor Yellow
    exit 1
}

# Validate Kubernetes manifests
Write-Host "\nValidating Kubernetes manifests..." -ForegroundColor Cyan

$k8sDir = "kubernetes\prod"
$manifestFiles = Get-ChildItem -Path $k8sDir -Recurse -Filter "*.yaml"

$invalidFiles = @()

foreach ($file in $manifestFiles) {
    Write-Host "Validating $($file.FullName)" -ForegroundColor Gray
    $result = kubectl apply --dry-run=client -f $file.FullName 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Invalid manifest: $($file.FullName)" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        $invalidFiles += $file.FullName
    } else {
        Write-Host "✓ Valid manifest: $($file.FullName)" -ForegroundColor Green
    }
}

if ($invalidFiles.Count -gt 0) {
    Write-Host "\nPlease fix the invalid Kubernetes manifests before proceeding." -ForegroundColor Yellow
    exit 1
}

# Verify Jenkinsfile exists
Write-Host "\nVerifying Jenkinsfile..." -ForegroundColor Cyan
if (Test-Path "Jenkinsfile") {
    Write-Host "✓ Jenkinsfile exists" -ForegroundColor Green
} else {
    Write-Host "✗ Jenkinsfile not found" -ForegroundColor Red
    exit 1
}

# Check Docker registry configuration
Write-Host "\nChecking Docker registry configuration in Jenkinsfile..." -ForegroundColor Cyan
$jenkinsContent = Get-Content "Jenkinsfile" -Raw

if ($jenkinsContent -match "DOCKER_REGISTRY = 'your-docker-registry'") {
    Write-Host "⚠ Docker registry not configured in Jenkinsfile" -ForegroundColor Yellow
    Write-Host "  Please update DOCKER_REGISTRY in Jenkinsfile with your actual Docker registry" -ForegroundColor Yellow
}

if ($jenkinsContent -match "DOCKER_CREDENTIALS_ID = 'docker-credentials-id'") {
    Write-Host "⚠ Docker credentials ID not configured in Jenkinsfile" -ForegroundColor Yellow
    Write-Host "  Please update DOCKER_CREDENTIALS_ID in Jenkinsfile with your actual Jenkins credentials ID" -ForegroundColor Yellow
}

if ($jenkinsContent -match "KUBECONFIG_CREDENTIALS_ID = 'kubeconfig-credentials-id'") {
    Write-Host "⚠ Kubeconfig credentials ID not configured in Jenkinsfile" -ForegroundColor Yellow
    Write-Host "  Please update KUBECONFIG_CREDENTIALS_ID in Jenkinsfile with your actual Jenkins credentials ID" -ForegroundColor Yellow
}

# Print deployment order
Write-Host "\nDeployment order in Jenkins pipeline:" -ForegroundColor Cyan
Write-Host "1. Create namespace (bazarstore-prod)" -ForegroundColor White
Write-Host "2. Apply ConfigMaps and Secrets" -ForegroundColor White
Write-Host "3. Apply Storage resources (PV/PVC)" -ForegroundColor White
Write-Host "4. Deploy PostgreSQL (Service and Deployment)" -ForegroundColor White
Write-Host "5. Deploy microservices (Catalog, Order, Core)" -ForegroundColor White
Write-Host "6. Deploy Ingress" -ForegroundColor White

# Success message
Write-Host "\nEnvironment validation complete. Ready for Jenkins pipeline execution." -ForegroundColor Green
Write-Host "Please refer to JENKINS_DEPLOYMENT_GUIDE.md for detailed instructions." -ForegroundColor Green