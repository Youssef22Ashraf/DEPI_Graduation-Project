
# Bazar.com: Multi-tier Online Book Store



## Overview

Bazar.com is a minimalist online bookstore implementing a multi-tier microservices architecture. The system consists of three primary components:

- **Core Service**: Handles user interactions and forwards requests
- **Catalog Service**: Manages book information and inventory
- **Order Service**: Processes purchases and maintains order history

The application uses Flask for the web framework with a REST API interface and Docker for containerization and deployment.

## Architecture


### Key Components

- **Core Tier**: Single service that accepts user requests for searching, viewing book details, and making purchases
- **Backend Tier**: 
  - Catalog Service: Maintains book information including stock levels, prices, and topics
  - Order Service: Handles purchase requests and maintains order history

### Features

- Search books by topic (distributed systems or undergraduate school)
- View detailed information about specific books
- Purchase books with inventory validation
- Persistent data storage using CSV files
- Containerized microservices for easy deployment

## Technologies Used

### Flask

Flask is a micro web framework written in Python that we've used for all three services. Some key aspects of how we've utilized Flask:

- **RESTful API Design**: Created clear endpoint routes following REST principles for each service
- **Blueprint Organization**: Logical organization of code for maintainability
- **Lightweight Processing**: Minimal overhead for handling requests between microservices
- **JSON Response Handling**: Standardized JSON responses across all API endpoints
- **Simple Request Processing**: Used Flask's request object to handle incoming data

Flask was chosen for its simplicity and flexibility, making it ideal for microservices. It doesn't impose a specific structure or dependencies, allowing each service to be truly independent and focused on its specific responsibility.

### Docker & Docker Compose

Docker containerization is used to package each microservice with its dependencies:

- **Isolated Environments**: Each service runs in its own container with specific dependencies
- **Networking**: Docker Compose creates a custom network allowing services to communicate by name
- **Volume Mapping**: Persistent data is stored in mapped volumes for CSV files
- **Reproducibility**: Consistent environment across development and deployment
- **Scalability**: Services can be scaled independently as needed
- **Zero-Configuration Deployment**: Environment variables and service discovery handled automatically

### PostgreSQL Database

The application has been updated to use PostgreSQL for data storage:

- **Relational Database**: Structured data storage with SQL support
- **Persistent Storage**: Data remains available between container restarts
- **Concurrent Access**: Handles multiple simultaneous connections
- **Transaction Support**: Ensures data integrity during operations
- **Docker Integration**: Runs in its own container with volume mapping

#### Database Connection Updates

The application has been updated to work both in Docker containers and locally:

- Added environment variable detection to determine if running in Docker or locally
- Updated service URLs to use container names in Docker and localhost when running locally
- Created a helper script (`run_local.py`) to easily run all services locally

### Python Libraries

- **Requests**: HTTP library for service-to-service communication
- **Flask-CORS**: Cross-Origin Resource Sharing support
- **CSV Module**: Python's built-in CSV handling for data persistence
- **JSON**: Used for standardized data exchange between services

## Running the Application

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- Git
- Python 3.9+ (for local development)

### Option 1: Using Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/YaraDaraghmeh/Bazar.com-A-Multi-tier-Online-Book-Store-.git
   cd Bazar.com-A-Multi-tier-Online-Book-Store-
   ```

2. Build and start the containers:
   ```bash
   docker-compose build
   docker-compose up
   ```

3. The application will be available at:
   ```
   http://localhost:5005
   ```

### Option 2: Running Locally

A helper script has been added to run the services locally:

```bash
# Navigate to the project directory
cd Bazar.com-A-Multi-tier-Online-Book-Store-

# Run the helper script
python run_local.py
```

The script will:
1. Start a PostgreSQL container if not already running
2. Start the Catalog Service on port 5000
3. Start the Order Service on port 5001
4. Start the Core Service on port 5005
5. Open your browser to http://localhost:5005

### API Endpoints

#### Core Service (port 5002)
- `GET /api/search/<topic>`: Search books by topic
- `GET /api/info/<item_id>`: Get book details
- `POST /api/purchase/<item_id>`: Purchase a book

#### Catalog Service (port 5000)
- `GET /search/<topic>`: Search books by topic
- `GET /info/<item_id>`: Get book details
- `PUT /update/<item_id>`: Update book price or quantity

#### Order Service (port 5001)
- `POST /purchase/<item_id>`: Process book purchase

## Development

### Project Structure

```
bazar/
├── docker-compose.yml
├── frontend/ # Directory name remains unchanged for compatibility
│   ├── Dockerfile
│   ├── app.py
│   ├── requirements.txt
│   └── templates/
│       └── index.html
├── catalog/
│   ├── Dockerfile
│   ├── app.py
│   ├── requirements.txt
│   └── data/
│       └── books.csv
└── order/
    ├── Dockerfile
    ├── app.py
    ├── requirements.txt
    └── data/
        └── orders.csv
```

### Data Persistence

The application uses CSV files for persistent storage:

- `catalog/data/books.csv`: Stores book information
- `order/data/orders.csv`: Stores order history

### Implementation Details

#### Core Service
The core service provides both a web UI and API endpoints that proxy requests to the appropriate backend service. It's responsible for:

- Rendering the HTML interface for users
- Routing API requests to the correct backend service
- Converting between API formats when necessary
- Providing a unified interface for the client

#### Catalog Service
The catalog service manages the book inventory with these key responsibilities:

- Searching books by topic
- Providing detailed book information
- Updating inventory when purchases are made
- Maintaining price information

#### Order Service
The order service handles all purchase-related logic:

- Verifying item availability by communicating with the catalog service
- Recording successful purchases with timestamps
- Updating inventory by communicating with the catalog service
- Generating unique order IDs
  
## Testing

### Manual Testing

1. **Search Books**:
   - Select a topic from the dropdown
   - Click "Search"
   - View list of matching books

2. **View Book Details**:
   - Enter a book ID (1-4)
   - Click "Get Info"
   - View details including price and stock level

3. **Purchase Book**:
   - Enter a book ID (1-4)
   - Click "Purchase"
   - Confirm successful purchase message

### Sample Test Cases

| Test | Input | Expected Output |
|------|-------|----------------|
| Search by topic | "distributed systems" | Books 1 & 2 |
| Get book info | ID: 3 | Title, price, and quantity for "Xen and the Art of Surviving Undergraduate School" |
| Purchase a book | ID: 1 | Success message and reduced inventory count |
| Purchase out-of-stock book | ID of out-of-stock book | Error message |

### Error Handling

The application includes robust error handling:

- **Input Validation**: Checks for valid book IDs and data formats
- **Inventory Validation**: Verifies stock levels before completing purchases
- **Service Unavailability**: Graceful handling when a service is down
- **Concurrency Issues**: Prevents race conditions when multiple purchases occur simultaneously


## Design Decisions & Tradeoffs

- **CSV over Database**: Chose CSV files for simplicity and portability, sacrificing query performance
- **Microservice Architecture**: Enables independent scaling and development but adds network complexity
- **Docker Containerization**: Ensures consistent environments but requires Docker knowledge
- **Flask**: Lightweight framework that's easy to learn but lacks some features of larger frameworks
- **REST API Design**: Standardized interface but requires more HTTP requests than more optimized protocols
- **No Authentication**: Simplified implementation but lacks security features needed in production


## Extending the Project

Potential enhancements:

- Add user authentication system
- Implement a shopping cart feature
- Replace CSV with a database backend (e.g., SQLite, PostgreSQL)
- Create admin interface for inventory management
- Add unit and integration tests
- Implement CI/CD pipeline
- Add logging and monitoring
- Add rate limiting for API endpoints
- Implement caching for frequently accessed data

## Performance Considerations

- **Service Communication**: Direct HTTP calls between services are simple but could be replaced with message queues for better reliability
- **Data Storage**: CSV files work for small data volumes but would need replacement for production scale
- **Concurrency**: Basic file locking is implemented but could be enhanced with proper database transactions
- **Caching**: No caching is currently implemented, which could be added for improved performance
## Contributors

- Yara - (https://github.com/YaraDaraghmeh)
- Shams - (https://github.com/ShamsAziz03)
