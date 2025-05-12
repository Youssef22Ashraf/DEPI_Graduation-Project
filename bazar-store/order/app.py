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
if os.environ.get('DOCKER_ENV') == 'true':
    DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@postgres:5432/bazarcom')
    CATALOG_SERVICE_URL = "http://catalog:5000"
else:
    DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/bazarcom')
    CATALOG_SERVICE_URL = "http://localhost:5000"

def get_db_connection():
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
    conn = get_db_connection()
    cur = conn.cursor()
    
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
        customer_email VARCHAR(255),
        phone_number VARCHAR(20),
        original_price DECIMAL(10, 2),
        discount_amount DECIMAL(10, 2),
        discount_applied BOOLEAN DEFAULT FALSE
    )
    ''')
    
    # Add missing columns if they don't exist
    columns_to_add = {
        'shipping_address': 'TEXT',
        'payment_method': 'VARCHAR(50)',
        'customer_email': 'VARCHAR(255)',
        'phone_number': 'VARCHAR(20)',
        'original_price': 'DECIMAL(10, 2)',
        'discount_amount': 'DECIMAL(10, 2)',
        'discount_applied': 'BOOLEAN DEFAULT FALSE'
    }
    
    for column, column_type in columns_to_add.items():
        cur.execute(f"""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='orders' AND column_name='{column}'
        """)
        if not cur.fetchone():
            cur.execute(f"ALTER TABLE orders ADD COLUMN {column} {column_type}")
            print(f"Added {column} column to orders table")
    
    cur.close()
    conn.close()

try:
    init_db()
    print("Database initialized successfully")
except Exception as e:
    print(f"Error initializing database: {e}")

@app.route('/purchase/<int:item_id>', methods=['POST'])
def purchase(item_id):
    purchase_data = request.json or {}
    shipping_address = purchase_data.get('shipping_address', '')
    payment_method = purchase_data.get('payment_method', '')
    customer_email = purchase_data.get('customer_email', '')
    phone_number = purchase_data.get('phone_number', '')
    discount_info = purchase_data.get('discount_info', {})
    
    response = requests.get(f"{CATALOG_SERVICE_URL}/info/{item_id}")
    if response.status_code != 200:
        return jsonify({'success': False, 'message': 'Book not found'}), 404
    
    book_data = response.json().get('book')
    if not book_data:
        return jsonify({'success': False, 'message': 'Book information not available'}), 404
    
    if book_data['quantity'] <= 0:
        return jsonify({'success': False, 'message': 'Book is out of stock'}), 400
    
    order_id = str(uuid.uuid4())[:8].upper()
    conn = get_db_connection()
    try:
        conn.autocommit = False
        cur = conn.cursor()
        timestamp = datetime.datetime.now()
        original_price = float(book_data['price'])
        final_price = original_price
        discount_amount = 0
        discount_applied = False
        
        if discount_info.get('has_discount', False):
            category = discount_info.get('category', '')
            category_count = discount_info.get('category_count', 0)
            discount_percentage = discount_info.get('discount_percentage', 15)
            if category and category_count >= 2:
                discount_applied = True
                discount_amount = original_price * (discount_percentage / 100)
                final_price = original_price - discount_amount
                print(f"Applied {discount_percentage}% discount for category '{category}' with {category_count} books")
        
        cur.execute('''
        INSERT INTO orders (order_id, item_id, timestamp, price, title, author, shipping_address, payment_method, 
                           customer_email, phone_number, original_price, discount_amount, discount_applied)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            f"ORD-{order_id}",
            item_id,
            timestamp,
            final_price,
            book_data['title'],
            book_data['author'],
            shipping_address,
            payment_method,
            customer_email,
            phone_number,
            original_price,
            discount_amount,
            discount_applied
        ))
        
        update_response = requests.put(
            f"{CATALOG_SERVICE_URL}/update/{item_id}",
            json={'quantity': book_data['quantity'] - 1}
        )
        
        if update_response.status_code != 200:
            conn.rollback()
            return jsonify({'success': False, 'message': 'Failed to update inventory'}), 500
        
        conn.commit()
        
        response_data = {
            'success': True,
            'message': 'Purchase successful',
            'order_id': f"ORD-{order_id}",
            'book': book_data['title'],
            'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        if discount_applied:
            response_data.update({
                'discount_applied': True,
                'original_price': original_price,
                'discount_amount': discount_amount,
                'final_price': final_price,
                'discount_percentage': discount_percentage,
                'discount_type': 'category',
                'category': category,
                'category_count': category_count,
                'discount_message': f"You saved ${discount_amount:.2f} with our category discount!"
            })
        
        return jsonify(response_data)
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Error processing purchase: {str(e)}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/orders', methods=['GET'])
def get_orders():
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
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('SELECT * FROM orders WHERE order_id = %s', (order_id,))
    items = cur.fetchall()
    
    if not items:
        return jsonify({'error': 'Order not found'}), 404
    
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
    try:
        conn = get_db_connection()
        conn.close()
        return jsonify({'status': 'ok'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)