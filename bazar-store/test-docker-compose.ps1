# Script to test the Docker Compose setup before deploying to Kubernetes

Write-Host "Testing Bazarcom application with Docker Compose..."
Write-Host "This will build and run all services to verify they work together properly."

# Stop any running containers from previous runs
Write-Host "Stopping any existing containers..."
docker-compose down

# Build and start the services
Write-Host "Building and starting services..."
docker-compose up --build -d

# Wait for services to start
Write-Host "Waiting for services to start (30 seconds)..."
Start-Sleep -Seconds 30

# Check if services are running
Write-Host "Checking if services are running..."
$services = docker-compose ps --services

foreach ($service in $services) {
    $status = docker-compose ps $service | Select-String "Up"
    if ($status) {
        Write-Host "$service is running" -ForegroundColor Green
    } else {
        Write-Host "$service is not running properly" -ForegroundColor Red
    }
}

# Test core service health endpoint
Write-Host "Testing core service health endpoint..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5005/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "Core service health check passed!" -ForegroundColor Green
        Write-Host "Response: $($response.Content)"
    } else {
        Write-Host "Core service health check failed with status code: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "Failed to connect to core service health endpoint: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Docker Compose test complete. If all services are running, you can proceed with Kubernetes deployment."
Write-Host "To access the application, open http://localhost:5005 in your browser."
Write-Host "To stop the services, run: docker-compose down"