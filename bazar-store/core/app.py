from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import json
import os

app = Flask(__name__)

# Check if running in Docker or locally
if os.environ.get('DOCKER_ENV') == 'true':
    # Docker environment - use service names
    CATALOG_SERVICE_URL = "http://catalog:5000"
    ORDER_SERVICE_URL = "http://order:5001"
else:
    # Local environment - use localhost
    CATALOG_SERVICE_URL = "http://localhost:5000"
    ORDER_SERVICE_URL = "http://localhost:5001"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search/<topic>', methods=['GET'])
def search(topic):
    try:
        response = requests.get(f"{CATALOG_SERVICE_URL}/search/{topic}", timeout=10)
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            error_message = f"Catalog service returned status code: {response.status_code}"
            print(error_message)
            return jsonify({"error": error_message, "books": []}), response.status_code
    except requests.exceptions.Timeout:
        error_message = "Request to catalog service timed out"
        print(error_message)
        return jsonify({"error": error_message, "books": []}), 504
    except requests.exceptions.ConnectionError:
        error_message = "Failed to connect to catalog service"
        print(error_message)
        return jsonify({"error": error_message, "books": []}), 503
    except Exception as e:
        error_message = f"Error searching for books: {str(e)}"
        print(error_message)
        return jsonify({"error": error_message, "books": []}), 500

@app.route('/api/search/recommended', methods=['GET'])
def recommended():
    # Get recommended books from catalog service
    try:
        response = requests.get(f"{CATALOG_SERVICE_URL}/search/programming", timeout=10)
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            error_message = f"Catalog service returned status code: {response.status_code}"
            print(error_message)
            return jsonify({"error": error_message, "books": []}), response.status_code
    except requests.exceptions.Timeout:
        error_message = "Request to catalog service timed out"
        print(error_message)
        return jsonify({"error": error_message, "books": []}), 504
    except requests.exceptions.ConnectionError:
        error_message = "Failed to connect to catalog service"
        print(error_message)
        return jsonify({"error": error_message, "books": []}), 503
    except Exception as e:
        error_message = f"Error fetching recommended books: {str(e)}"
        print(error_message)
        return jsonify({"error": error_message, "books": []}), 500

@app.route('/api/info/<int:item_id>', methods=['GET'])
def info(item_id):
    response = requests.get(f"{CATALOG_SERVICE_URL}/info/{item_id}")
    return jsonify(response.json())

@app.route('/api/catalog/add-stock', methods=['POST'])
def add_stock():
    # Forward the stock data to the catalog service
    response = requests.post(
        f"{CATALOG_SERVICE_URL}/add-stock",
        json=request.json
    )
    return jsonify(response.json()), response.status_code

@app.route('/api/purchase/<int:item_id>', methods=['POST'])
def purchase(item_id):
    # Get purchase data from request
    purchase_data = request.json
    
    # Forward the purchase data to the order service
    response = requests.post(
        f"{ORDER_SERVICE_URL}/purchase/{item_id}",
        json=purchase_data
    )
    return jsonify(response.json()), response.status_code

@app.route('/api/orders', methods=['GET'])
def get_orders():
    # Forward request to order service
    response = requests.get(f"{ORDER_SERVICE_URL}/orders")
    return jsonify(response.json()), response.status_code

@app.route('/api/orders/<order_id>', methods=['GET'])
def get_order_details(order_id):
    # Forward request to order service
    response = requests.get(f"{ORDER_SERVICE_URL}/orders/{order_id}")
    return jsonify(response.json()), response.status_code

@app.route('/api/history', methods=['GET'])
def purchase_history():
    # Redirect to the orders endpoint for backward compatibility
    response = requests.get(f"{ORDER_SERVICE_URL}/orders")
    return jsonify(response.json()), response.status_code

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005)