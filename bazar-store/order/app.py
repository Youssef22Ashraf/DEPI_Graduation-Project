from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import requests
import datetime
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
import time

app = Flask(__name__)
CORS(app)

# Database connection
# Use localhost when running locally, and container name when in Docker
if os.environ.get('DOCKER_ENV') == 'true':
    # Docker environment
    DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@postgres:5432/bazarcom')
    CATALOG_SERVICE_URL = "http://catalog:5000"
else:
    # Local environment
    DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/bazarcom')
    CATALOG_SERVICE_URL = "http://localhost:5000"

def get_db_connection():
    """Get a database connection"""
    # Retry logic for database connection
    max_retries = 5
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
            conn.autocommit = True
            return conn
        except Exception as e:
            retry_count += 1
            print(f"Database connection attempt {retry_count} failed: {e}")
            time.sleep(2)
    
    raise Exception("Failed to connect to the database after multiple attempts")

def init_db():
    """Initialize the database with tables"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Create orders table if it doesn't exist
    cur.execute('''
    CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(20) NOT NULL,
        item_id INTEGER NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        shipping_address TEXT,
        payment_method VARCHAR(50),
        original_price DECIMAL(10, 2),
        discount_amount DECIMAL(10, 2),
        discount_applied BOOLEAN DEFAULT FALSE
    )
    ''')
    
    # Check if shipping_address column exists, add it if not
    cur.execute("""SELECT column_name FROM information_schema.columns 
                  WHERE table_name='orders' AND column_name='shipping_address'""")
    if not cur.fetchone():
        cur.execute("ALTER TABLE orders ADD COLUMN shipping_address TEXT")
        print("Added shipping_address column to orders table")
    
    # Check if payment_method column exists, add it if not
    cur.execute("""SELECT column_name FROM information_schema.columns 
                  WHERE table_name='orders' AND column_name='payment_method'""")
    if not cur.fetchone():
        cur.execute("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50)")
        print("Added payment_method column to orders table")
        
    # Check if discount columns exist, add them if not
    cur.execute("""SELECT column_name FROM information_schema.columns 
                  WHERE table_name='orders' AND column_name='original_price'""")
    if not cur.fetchone():
        cur.execute("ALTER TABLE orders ADD COLUMN original_price DECIMAL(10, 2)")
        print("Added original_price column to orders table")
        
    cur.execute("""SELECT column_name FROM information_schema.columns 
                  WHERE table_name='orders' AND column_name='discount_amount'""")
    if not cur.fetchone():
        cur.execute("ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10, 2)")
        print("Added discount_amount column to orders table")
        
    cur.execute("""SELECT column_name FROM information_schema.columns 
                  WHERE table_name='orders' AND column_name='discount_applied'""")
    if not cur.fetchone():
        cur.execute("ALTER TABLE orders ADD COLUMN discount_applied BOOLEAN DEFAULT FALSE")
        print("Added discount_applied column to orders table")
    
    cur.close()
    conn.close()

# Initialize the database
try:
    init_db()
    print("Database initialized successfully")
except Exception as e:
    print(f"Error initializing database: {e}")

@app.route('/purchase/<int:item_id>', methods=['POST'])
def purchase(item_id):
    """Process a purchase for a book"""
    # Get purchase data from request
    purchase_data = request.json or {}
    shipping_address = purchase_data.get('shipping_address', '')
    payment_method = purchase_data.get('payment_method', '')
    
    # Get discount information if available
    discount_info = purchase_data.get('discount_info', {})
    cart_items = purchase_data.get('cart_items', [])
    
    # Get book information from catalog service
    response = requests.get(f"{CATALOG_SERVICE_URL}/info/{item_id}")
    
    if response.status_code != 200:
        return jsonify({'success': False, 'message': 'Book not found'}), 404
    
    book_data = response.json().get('book')
    
    if not book_data:
        return jsonify({'success': False, 'message': 'Book information not available'}), 404
    
    # Check if book is in stock
    if book_data['quantity'] <= 0:
        return jsonify({'success': False, 'message': 'Book is out of stock'}), 400
    
    # Generate unique order ID
    order_id = str(uuid.uuid4())[:8].upper()
    
    # Start a transaction to ensure atomicity
    conn = get_db_connection()
    try:
        # Begin transaction
        conn.autocommit = False
        cur = conn.cursor()
        
        timestamp = datetime.datetime.now()
        
        # Calculate the final price with discount if applicable
        original_price = float(book_data['price'])
        final_price = original_price
        discount_amount = 0
        discount_applied = False
        
        # Apply discount if available in the request
        if discount_info and discount_info.get('has_discount', False):
            # Check if this is a multi-book order with a category discount
            category = discount_info.get('category', '')
            category_count = discount_info.get('category_count', 0)
            discount_percentage = discount_info.get('discount_percentage', 15)  # Default to 15%
            
            # Apply discount if there are at least 2 books from the same category
            if category and category_count >= 2:
                discount_applied = True
                discount_amount = original_price * (discount_percentage / 100)
                final_price = original_price - discount_amount
                print(f"Applied {discount_percentage}% discount for category '{category}' with {category_count} books")
        
        # Record the purchase in database first
        cur.execute('''
        INSERT INTO orders (order_id, item_id, timestamp, price, title, author, shipping_address, payment_method, 
                           original_price, discount_amount, discount_applied)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            f"ORD-{order_id}",
            item_id,
            timestamp,
            final_price,  # Use the discounted price
            book_data['title'],
            book_data['author'],
            shipping_address,
            payment_method,
            original_price,
            discount_amount,
            discount_applied
        ))
        
        # Only update inventory after we've successfully recorded the order
        update_response = requests.put(
            f"{CATALOG_SERVICE_URL}/update/{item_id}",
            json={'quantity': book_data['quantity'] - 1}
        )
        
        if update_response.status_code != 200:
            # Roll back the transaction if inventory update fails
            conn.rollback()
            return jsonify({'success': False, 'message': 'Failed to update inventory'}), 500
        
        # Commit the transaction
        conn.commit()
        
        # Include discount information in the response
        response_data = {
            'success': True,
            'message': 'Purchase successful',
            'order_id': f"ORD-{order_id}",
            'book': book_data['title'],
            'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Add discount information to the response if applicable
        if discount_applied:
            response_data.update({
                'discount_applied': True,
                'original_price': original_price,
                'discount_amount': discount_amount,
                'final_price': final_price,
                'discount_percentage': discount_info.get('discount_percentage', 15),
                'discount_type': 'category',
                'category': discount_info.get('category', ''),
                'category_count': discount_info.get('category_count', 0),
                'discount_message': f"You saved ${discount_amount:.2f} with our category discount!"
            })
        
        return jsonify(response_data)
    except Exception as e:
        # Roll back the transaction if any error occurs
        conn.rollback()
        return jsonify({'success': False, 'message': f'Error processing purchase: {str(e)}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/orders', methods=['GET'])
def get_orders():
    """Get all orders"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('''
        SELECT 
            order_id, 
            MAX(timestamp) as order_date, 
            SUM(price) as total_amount,
            COUNT(*) as item_count
        FROM orders 
        GROUP BY order_id 
        ORDER BY MAX(timestamp) DESC
    ''')
    orders = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return jsonify({'orders': orders})

@app.route('/orders/<order_id>', methods=['GET'])
def get_order_details(order_id):
    """Get details for a specific order"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Get order items
    cur.execute('SELECT * FROM orders WHERE order_id = %s', (order_id,))
    items = cur.fetchall()
    
    if not items:
        return jsonify({'error': 'Order not found'}), 404
    
    # Get order summary
    cur.execute('''
        SELECT 
            order_id, 
            MAX(timestamp) as order_date, 
            SUM(price) as total_amount,
            COUNT(*) as item_count,
            MAX(shipping_address) as shipping_address,
            MAX(payment_method) as payment_method
        FROM orders 
        WHERE order_id = %s
        GROUP BY order_id
    ''', (order_id,))
    order = cur.fetchone()
    
    cur.close()
    conn.close()
    
    # Format the response to match what the frontend expects
    formatted_items = []
    for item in items:
        formatted_items.append({
            'id': item['id'],
            'order_id': item['order_id'],
            'item_id': item['item_id'],
            'title': item['title'],
            'author': item['author'],
            'price': float(item['price']),
            'timestamp': item['timestamp'].strftime('%Y-%m-%d %H:%M:%S') if item['timestamp'] else None
        })
    
    return jsonify({'order': order, 'items': formatted_items})

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        conn.close()
        return jsonify({'status': 'ok'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)