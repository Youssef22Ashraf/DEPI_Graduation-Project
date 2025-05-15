from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
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
else:
    # Local environment
    DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/bazarcom')

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
    """Initialize the database with tables and sample data"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Create books table if it doesn't exist
    cur.execute('''
    CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        quantity INTEGER NOT NULL,
        topic VARCHAR(255) NOT NULL,
        description TEXT NOT NULL
    )
    ''')
    
    # Check if we need to insert sample data
    cur.execute('SELECT COUNT(*) FROM books')
    count = cur.fetchone()['count']
    
    if count == 0:
        # Insert sample data
        sample_books = [
            (1, 'Distributed Systems: Principles and Paradigms', 'Andrew S. Tanenbaum', 79.99, 10, 'distributed systems', 
             'This book covers the principles, advanced concepts, and technologies of distributed systems in detail, including communication, replication, fault tolerance, and security.'),
            (2, 'Database System Concepts', 'Abraham Silberschatz', 89.99, 15, 'undergraduate school', 
             'Database System Concepts provides a comprehensive introduction to database systems, covering database design, query languages, transaction processing, and more.'),
            (3, 'Computer Networks', 'Andrew S. Tanenbaum', 69.99, 8, 'undergraduate school', 
             'This classic textbook provides a comprehensive look at the architecture, principles, and technologies of computer networks, from the physical layer to the application layer.'),
            (4, 'Modern Operating Systems', 'Andrew S. Tanenbaum', 74.99, 12, 'undergraduate school', 
             'A comprehensive guide to operating systems, covering processes, memory management, file systems, and distributed systems.'),
            (5, 'Designing Data-Intensive Applications', 'Martin Kleppmann', 59.99, 20, 'distributed systems', 
             'This book examines the key principles, algorithms, and trade-offs of data systems, with a focus on the challenges of scalability, consistency, reliability, and maintainability.')
        ]
        
        for book in sample_books:
            cur.execute('''
            INSERT INTO books (id, title, author, price, quantity, topic, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', book)
    
    cur.close()
    conn.close()

# Initialize the database
try:
    init_db()
    print("Database initialized successfully")
except Exception as e:
    print(f"Error initializing database: {e}")

@app.route('/search/<topic>', methods=['GET'])
def search(topic):
    """Search books by topic"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        search_term = f"%{topic.lower()}%"
        cur.execute('''
        SELECT * FROM books 
        WHERE LOWER(topic) LIKE %s 
        OR LOWER(title) LIKE %s 
        OR LOWER(author) LIKE %s
        ''', (search_term, search_term, search_term))
        
        books = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({'books': books})
    except Exception as e:
        print(f"Error in search endpoint: {str(e)}")
        return jsonify({'error': str(e), 'books': []}), 500

@app.route('/info/<int:item_id>', methods=['GET'])
def info(item_id):
    """Get book information by ID"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('SELECT * FROM books WHERE id = %s', (item_id,))
        book = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if book:
            return jsonify({'book': book})
        else:
            return jsonify({'error': 'Book not found'}), 404
    except Exception as e:
        print(f"Error in info endpoint: {str(e)}")
        return jsonify({'error': str(e), 'book': None}), 500

@app.route('/update/<int:item_id>', methods=['PUT'])
def update(item_id):
    """Update book information (price or quantity)"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Check if book exists
    cur.execute('SELECT * FROM books WHERE id = %s', (item_id,))
    book = cur.fetchone()
    
    if not book:
        cur.close()
        conn.close()
        return jsonify({'error': 'Book not found'}), 404
    
    data = request.get_json()
    
    if 'price' in data:
        cur.execute('UPDATE books SET price = %s WHERE id = %s', 
                   (float(data['price']), item_id))
    
    if 'quantity' in data:
        cur.execute('UPDATE books SET quantity = %s WHERE id = %s', 
                   (int(data['quantity']), item_id))
    
    # Get updated book
    cur.execute('SELECT * FROM books WHERE id = %s', (item_id,))
    updated_book = cur.fetchone()
    
    cur.close()
    conn.close()
    
    return jsonify({'book': updated_book})

@app.route('/add-stock', methods=['POST'])
def add_stock():
    """Add a new book or increase quantity of existing book"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    data = request.get_json()
    
    # Check if required fields are present for new book
    if 'is_new' in data and data['is_new']:
        required_fields = ['title', 'author', 'price', 'quantity', 'topic', 'description']
        for field in required_fields:
            if field not in data:
                cur.close()
                conn.close()
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Insert new book
        cur.execute('''
        INSERT INTO books (title, author, price, quantity, topic, description)
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
        ''', (
            data['title'],
            data['author'],
            float(data['price']),
            int(data['quantity']),
            data['topic'],
            data['description']
        ))
        
        new_book_id = cur.fetchone()['id']
        
        # Get the newly added book
        cur.execute('SELECT * FROM books WHERE id = %s', (new_book_id,))
        new_book = cur.fetchone()
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'New book added successfully',
            'book': new_book
        })
    
    # Increase quantity of existing book
    elif 'item_id' in data and 'quantity' in data:
        item_id = data['item_id']
        quantity_to_add = int(data['quantity'])
        
        # Check if book exists
        cur.execute('SELECT * FROM books WHERE id = %s', (item_id,))
        book = cur.fetchone()
        
        if not book:
            cur.close()
            conn.close()
            return jsonify({'error': 'Book not found'}), 404
        
        # Update quantity
        new_quantity = book['quantity'] + quantity_to_add
        cur.execute('UPDATE books SET quantity = %s WHERE id = %s', 
                   (new_quantity, item_id))
        
        # Get updated book
        cur.execute('SELECT * FROM books WHERE id = %s', (item_id,))
        updated_book = cur.fetchone()
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Book quantity updated successfully',
            'book': updated_book
        })
    
    else:
        cur.close()
        conn.close()
        return jsonify({'error': 'Invalid request parameters'}), 400

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
    app.run(host='0.0.0.0', port=5000)