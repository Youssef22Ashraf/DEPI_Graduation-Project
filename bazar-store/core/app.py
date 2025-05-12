from flask import Flask, render_template, request, jsonify
import requests
import os
import time

app = Flask(__name__, template_folder='templates', static_folder='static')

# Configure service URLs based on environment
if os.environ.get('DOCKER_ENV') == 'true':
    CATALOG_SERVICE_URL = os.environ.get('CATALOG_SERVICE_URL', "http://catalog:5000")
    ORDER_SERVICE_URL = os.environ.get('ORDER_SERVICE_URL', "http://order:5001")
else:
    CATALOG_SERVICE_URL = os.environ.get('CATALOG_SERVICE_URL', "http://localhost:5000")
    ORDER_SERVICE_URL = os.environ.get('ORDER_SERVICE_URL', "http://localhost:5001")

# Set a timeout for API requests to prevent hanging
REQUEST_TIMEOUT = 5  # seconds

@app.route('/')
def index():
    """Render the main page"""
    # Pass the service URLs to the template
    return render_template('index.html', 
                          catalog_url=CATALOG_SERVICE_URL,
                          order_url=ORDER_SERVICE_URL)

@app.route('/api/search/<topic>')
def search(topic):
    """Search for books by topic"""
    try:
        response = requests.get(f"{CATALOG_SERVICE_URL}/search/{topic}", timeout=REQUEST_TIMEOUT)
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error in search endpoint: {str(e)}")
        return jsonify({'error': str(e), 'books': []}), 500

@app.route('/api/search/recommended')
def recommended():
    """Get recommended books"""
    try:
        response = requests.get(f"{CATALOG_SERVICE_URL}/search/programming", timeout=REQUEST_TIMEOUT)
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error in recommended endpoint: {str(e)}")
        return jsonify({'error': str(e), 'books': []}), 500

@app.route('/api/info/<item_id>')
def info(item_id):
    """Get book details"""
    try:
        response = requests.get(f"{CATALOG_SERVICE_URL}/info/{item_id}", timeout=REQUEST_TIMEOUT)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error in info endpoint: {str(e)}")
        return jsonify({'error': str(e), 'book': None}), 500

@app.route('/api/purchase/<item_id>', methods=['POST'])
def purchase(item_id):
    """Process a purchase"""
    try:
        response = requests.post(f"{ORDER_SERVICE_URL}/purchase/{item_id}", 
                                json=request.json, 
                                timeout=REQUEST_TIMEOUT)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error in purchase endpoint: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/catalog/add-stock', methods=['POST'])
def add_stock():
    """Add stock to a book"""
    try:
        response = requests.post(f"{CATALOG_SERVICE_URL}/add-stock", 
                                json=request.json, 
                                timeout=REQUEST_TIMEOUT)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error in add-stock endpoint: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/orders', methods=['GET'])
def get_orders():
    """Get all orders"""
    try:
        response = requests.get(f"{ORDER_SERVICE_URL}/orders", timeout=REQUEST_TIMEOUT)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error in orders endpoint: {str(e)}")
        return jsonify({'error': str(e), 'orders': []}), 500

@app.route('/api/orders/<order_id>', methods=['GET'])
def get_order_details(order_id):
    """Get details for a specific order"""
    try:
        response = requests.get(f"{ORDER_SERVICE_URL}/orders/{order_id}", timeout=REQUEST_TIMEOUT)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error in order details endpoint: {str(e)}")
        return jsonify({'error': str(e), 'items': []}), 500

@app.route('/api/history', methods=['GET'])
def history():
    """Legacy route for purchase history"""
    return get_orders()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005)
