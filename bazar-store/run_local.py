import subprocess
import time
import os
import sys
import webbrowser

def print_colored(text, color):
    colors = {
        'green': '\033[92m',
        'yellow': '\033[93m',
        'red': '\033[91m',
        'blue': '\033[94m',
        'end': '\033[0m'
    }
    print(f"{colors.get(color, '')}\n{text}{colors.get('end', '')}")

def run_command(command, cwd=None):
    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            cwd=cwd
        )
        stdout, stderr = process.communicate()
        return process.returncode, stdout.decode('utf-8', errors='ignore'), stderr.decode('utf-8', errors='ignore')
    except Exception as e:
        return 1, '', str(e)

def check_postgres():
    print_colored("Checking if PostgreSQL is running locally...", "blue")
    code, stdout, stderr = run_command("docker ps | findstr postgres")
    if "postgres" in stdout:
        print_colored("PostgreSQL is running in Docker", "green")
        return True
    
    # Try to start PostgreSQL container
    print_colored("Starting PostgreSQL container...", "yellow")
    code, stdout, stderr = run_command("docker run --name bazarcom-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=bazarcom -p 5432:5432 -d postgres:13")
    if code != 0 and "already in use" not in stderr:
        print_colored(f"Failed to start PostgreSQL container: {stderr}", "red")
        return False
    
    print_colored("PostgreSQL container started successfully", "green")
    return True

def start_catalog_service():
    print_colored("Starting Catalog Service...", "blue")
    catalog_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "catalog")
    
    # Set environment variables
    env = os.environ.copy()
    env["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/bazarcom"
    
    # Start the service
    try:
        process = subprocess.Popen(
            [sys.executable, "app.py"],
            cwd=catalog_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print_colored("Catalog Service started on http://localhost:5000", "green")
        return process
    except Exception as e:
        print_colored(f"Failed to start Catalog Service: {str(e)}", "red")
        return None

def start_order_service():
    print_colored("Starting Order Service...", "blue")
    order_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "order")
    
    # Set environment variables
    env = os.environ.copy()
    env["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/bazarcom"
    
    # Start the service
    try:
        process = subprocess.Popen(
            [sys.executable, "app.py"],
            cwd=order_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print_colored("Order Service started on http://localhost:5001", "green")
        return process
    except Exception as e:
        print_colored(f"Failed to start Order Service: {str(e)}", "red")
        return None

def start_core_service():
    print_colored("Starting Core Service...", "blue")
    core_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "core")
    
    # Start the service
    try:
        process = subprocess.Popen(
            [sys.executable, "app.py"],
            cwd=core_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print_colored("Core Service started on http://localhost:5005", "green")
        return process
    except Exception as e:
        print_colored(f"Failed to start Core Service: {str(e)}", "red")
        return None

def main():
    print_colored("=== Bazar.com Local Development Environment ===\n", "blue")
    
    # Check PostgreSQL
    if not check_postgres():
        print_colored("Cannot proceed without PostgreSQL. Exiting.", "red")
        return
    
    # Start services
    catalog_process = start_catalog_service()
    if not catalog_process:
        print_colored("Cannot proceed without Catalog Service. Exiting.", "red")
        return
    
    # Wait for catalog service to initialize
    print_colored("Waiting for Catalog Service to initialize...", "yellow")
    time.sleep(5)
    
    order_process = start_order_service()
    if not order_process:
        print_colored("Cannot proceed without Order Service. Exiting.", "red")
        catalog_process.terminate()
        return
    
    # Wait for order service to initialize
    print_colored("Waiting for Order Service to initialize...", "yellow")
    time.sleep(3)
    
    core_process = start_core_service()
    if not core_process:
        print_colored("Cannot proceed without Core Service. Exiting.", "red")
        catalog_process.terminate()
        order_process.terminate()
        return
    
    # Open browser
    print_colored("Opening browser to http://localhost:5005", "blue")
    time.sleep(2)
    webbrowser.open("http://localhost:5005")
    
    print_colored("\nAll services are running. Press Ctrl+C to stop all services.", "green")
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print_colored("\nStopping all services...", "yellow")
        core_process.terminate()
        order_process.terminate()
        catalog_process.terminate()
        print_colored("All services stopped. You may need to stop the PostgreSQL container manually with 'docker stop bazarcom-postgres'.", "blue")

if __name__ == "__main__":
    main()