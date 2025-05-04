from flask import Flask, jsonify, request, render_template, redirect, url_for, flash, session
import psycopg2
from psycopg2.extras import RealDictCursor
import atexit
import os
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
load_dotenv()  # Add this before connection attempt

try:
    connection = psycopg2.connect(
        dbname=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        host=os.getenv('DB_HOST'),
        port=os.getenv('DB_PORT'),
        cursor_factory=RealDictCursor
    )
    connection.autocommit = False  # Add transaction control
    print('Successful connection to the database')
except Exception as error:
    print(f'Database connection error: {error}')
    raise  # Prevent app from starting with bad connection

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-key-for-flask-sessions')
port = 5001

# Initialize database tables if they don't exist
def init_db():
    try:
        with connection.cursor() as cursor:
            # Drop existing tables if they exist (in reverse order of dependencies)
            cursor.execute("DROP TABLE IF EXISTS order_items CASCADE")
            cursor.execute("DROP TABLE IF EXISTS orders CASCADE")
            cursor.execute("DROP TABLE IF EXISTS favorites CASCADE")
            cursor.execute("DROP TABLE IF EXISTS cart_items CASCADE")
            cursor.execute("DROP TABLE IF EXISTS books CASCADE")
            cursor.execute("DROP TABLE IF EXISTS authors CASCADE")
            cursor.execute("DROP TABLE IF EXISTS users CASCADE")
            
            # Create users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    is_admin BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create authors table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS authors (
                    author_id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    age INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create books table with quantity
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS books (
                    book_id SERIAL PRIMARY KEY,
                    isbn VARCHAR(13) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    cant_pages INTEGER,
                    price DECIMAL(10, 2) DEFAULT 0.00,
                    description TEXT,
                    cover_url VARCHAR(255),
                    quantity INTEGER DEFAULT 0,
                    author_id INTEGER REFERENCES authors(author_id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create cart table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cart_items (
                    cart_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
                    quantity INTEGER DEFAULT 1,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, book_id)
                )
            """)
            
            # Create favorites table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS favorites (
                    favorite_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, book_id)
                )
            """)
            
            # Create orders table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    order_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
                    total_amount DECIMAL(10, 2) NOT NULL,
                    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(20) DEFAULT 'completed'
                )
            """)
            
            # Create order items table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS order_items (
                    order_item_id SERIAL PRIMARY KEY,
                    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
                    book_id INTEGER REFERENCES books(book_id) ON DELETE SET NULL,
                    quantity INTEGER NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    book_name VARCHAR(255) NOT NULL
                )
            """)
            
            # Add admin user
            cursor.execute("""
                INSERT INTO users (username, email, password_hash, is_admin) 
                VALUES ('admin', 'admin@bookstore.com', %s, TRUE)
                ON CONFLICT (username) DO NOTHING
            """, (generate_password_hash('admin123'),))
            
            # Always populate with sample data
            # Add sample authors
            authors = [
                ('J.K. Rowling', 56),
                ('George Orwell', 46),
                ('Jane Austen', 41),
                ('Stephen King', 74),
                ('Agatha Christie', 85),
                ('J.R.R. Tolkien', 81),
                ('Dan Brown', 57),
                ('Harper Lee', 89),
                ('F. Scott Fitzgerald', 44),
                ('Ernest Hemingway', 61),
                ('Mark Twain', 74),
                ('Charles Dickens', 58),
                ('Leo Tolstoy', 82),
                ('Gabriel García Márquez', 87),
                ('Virginia Woolf', 59)
            ]
            
            author_ids = {}
            for author in authors:
                cursor.execute(
                    "INSERT INTO authors (name, age) VALUES (%s, %s) RETURNING author_id",
                    author
                )
                author_id = cursor.fetchone()['author_id']
                author_ids[author[0]] = author_id
                
            # Add sample books with quantity
            books = [
                ('9780747532743', 'Harry Potter and the Philosopher\'s Stone', 223, 19.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/81m1s4wIPML._AC_UF1000,1000_QL80_.jpg', 'The first book in the Harry Potter series', 50),
                ('9780747538486', 'Harry Potter and the Chamber of Secrets', 251, 19.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/91OINeHnJGL._AC_UF1000,1000_QL80_.jpg', 'The second book in the Harry Potter series', 45),
                ('9780747546290', 'Harry Potter and the Prisoner of Azkaban', 317, 19.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/81lAPl9Fl0L._AC_UF1000,1000_QL80_.jpg', 'The third book in the Harry Potter series', 40),
                ('9780747551003', 'Harry Potter and the Goblet of Fire', 636, 24.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/81t2CVWEsUL._AC_UF1000,1000_QL80_.jpg', 'The fourth book in the Harry Potter series', 35),
                ('9780747570738', 'Harry Potter and the Order of Phoenix', 766, 24.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/71xcuT33RpL._AC_UF1000,1000_QL80_.jpg', 'The fifth book in the Harry Potter series', 30),
                ('9780747581086', 'Harry Potter and the Half-Blood Prince', 607, 24.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/61sXBXmAWML._AC_UF1000,1000_QL80_.jpg', 'The sixth book in the Harry Potter series', 25),
                ('9780545010221', 'Harry Potter and the Deathly Hallows', 607, 24.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/71sH3vxziLL._AC_UF1000,1000_QL80_.jpg', 'The seventh book in the Harry Potter series', 20),
                ('9780451524935', '1984', 328, 12.99, author_ids['George Orwell'], 
                 'https://m.media-amazon.com/images/I/71kxa1-0mfL._AC_UF1000,1000_QL80_.jpg', 'A dystopian novel by George Orwell', 30),
                ('9780452284241', 'Animal Farm', 140, 9.99, author_ids['George Orwell'], 
                 'https://m.media-amazon.com/images/I/71KV-OBJVsL._AC_UF1000,1000_QL80_.jpg', 'An allegorical novella by George Orwell', 25),
                ('9780141439518', 'Pride and Prejudice', 432, 9.99, author_ids['Jane Austen'], 
                 'https://m.media-amazon.com/images/I/71Q1tPupKjL._AC_UF1000,1000_QL80_.jpg', 'A romantic novel by Jane Austen', 25),
                ('9780141439662', 'Sense and Sensibility', 409, 9.99, author_ids['Jane Austen'], 
                 'https://m.media-amazon.com/images/I/71HTLQ-dJJL._AC_UF1000,1000_QL80_.jpg', 'A novel by Jane Austen', 20),
                ('9781501142970', 'It', 1138, 24.99, author_ids['Stephen King'], 
                 'https://m.media-amazon.com/images/I/71tFhdcC0XL._AC_UF1000,1000_QL80_.jpg', 'A horror novel about a shape-shifting entity', 20),
                ('9781501156700', 'The Shining', 447, 17.99, author_ids['Stephen King'], 
                 'https://m.media-amazon.com/images/I/81w6RyQT-TL._AC_UF1000,1000_QL80_.jpg', 'A horror novel set in an isolated hotel', 15),
                ('9780062073488', 'Murder on the Orient Express', 256, 14.99, author_ids['Agatha Christie'], 
                 'https://m.media-amazon.com/images/I/81yY5OwUQOL._AC_UF1000,1000_QL80_.jpg', 'A detective novel featuring Hercule Poirot', 15),
                ('9780062073563', 'And Then There Were None', 272, 14.99, author_ids['Agatha Christie'], 
                 'https://m.media-amazon.com/images/I/81B9LhCS2AL._AC_UF1000,1000_QL80_.jpg', 'A mystery novel by Agatha Christie', 10),
                ('9780618640157', 'The Lord of the Rings', 1178, 29.99, author_ids['J.R.R. Tolkien'], 
                 'https://m.media-amazon.com/images/I/71jLBXtWJWL._AC_UF1000,1000_QL80_.jpg', 'An epic high-fantasy novel', 20),
                ('9780547928227', 'The Hobbit', 300, 14.99, author_ids['J.R.R. Tolkien'], 
                 'https://m.media-amazon.com/images/I/710+HcoP38L._AC_UF1000,1000_QL80_.jpg', 'A fantasy novel and prequel to The Lord of the Rings', 25),
                ('9780307474278', 'The Da Vinci Code', 597, 16.99, author_ids['Dan Brown'], 
                 'https://m.media-amazon.com/images/I/81c5QZzP8aL._AC_UF1000,1000_QL80_.jpg', 'A mystery thriller novel', 30),
                ('9780060935467', 'To Kill a Mockingbird', 336, 14.99, author_ids['Harper Lee'], 
                 'https://m.media-amazon.com/images/I/71FxgtFKcQL._AC_UF1000,1000_QL80_.jpg', 'A novel about racial inequality in the American South', 35),
                ('9780743273565', 'The Great Gatsby', 180, 12.99, author_ids['F. Scott Fitzgerald'], 
                 'https://m.media-amazon.com/images/I/71FTb9X6wsL._AC_UF1000,1000_QL80_.jpg', 'A novel about the American Dream in the 1920s', 25),
                ('9780684801223', 'The Old Man and the Sea', 128, 11.99, author_ids['Ernest Hemingway'], 
                 'https://m.media-amazon.com/images/I/61Ui-IgfvdL._AC_UF1000,1000_QL80_.jpg', 'A short novel about an aging Cuban fisherman', 20),
                ('9780486280615', 'The Adventures of Huckleberry Finn', 224, 5.99, author_ids['Mark Twain'], 
                 'https://m.media-amazon.com/images/I/81wdR+2vBwL._AC_UF1000,1000_QL80_.jpg', 'A novel about a boy\'s journey down the Mississippi River', 15),
                ('9780141439563', 'A Tale of Two Cities', 489, 8.99, author_ids['Charles Dickens'], 
                 'https://m.media-amazon.com/images/I/51rVPckPtuL._AC_UF1000,1000_QL80_.jpg', 'A historical novel set during the French Revolution', 10),
                ('9780143035008', 'Anna Karenina', 864, 16.99, author_ids['Leo Tolstoy'], 
                 'https://m.media-amazon.com/images/I/91F9WKW99NL._AC_UF1000,1000_QL80_.jpg', 'A novel about an extramarital affair in Russian society', 15),
                ('9780060883287', 'One Hundred Years of Solitude', 417, 15.99, author_ids['Gabriel García Márquez'], 
                 'https://m.media-amazon.com/images/I/81MI6+TpYkL._AC_UF1000,1000_QL80_.jpg', 'A landmark of magical realism', 20),
                ('9780156030359', 'To the Lighthouse', 209, 13.99, author_ids['Virginia Woolf'], 
                 'https://m.media-amazon.com/images/I/71c1ltgBXdL._AC_UF1000,1000_QL80_.jpg', 'A modernist novel about the Ramsay family', 10)
            ]
            
            for book in books:
                cursor.execute("""
                    INSERT INTO books (isbn, name, cant_pages, price, author_id, cover_url, description, quantity) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, book)
            
            connection.commit()
            print("Database tables initialized successfully with sample data")
    except Exception as error:
        print(f"Error initializing database: {error}")
        connection.rollback()

# Always call init_db at startup to reset and populate the database
init_db()

# Remove the separate populate_sample_data function since init_db already does this
# This ensures the database is always fresh with the correct sample data

def populate_sample_data():
    try:
        with connection.cursor() as cursor:
            # First clear existing data
            cursor.execute("DELETE FROM order_items")
            cursor.execute("DELETE FROM orders")
            cursor.execute("DELETE FROM favorites")
            cursor.execute("DELETE FROM cart_items")
            cursor.execute("DELETE FROM books")
            cursor.execute("DELETE FROM authors")
            
            # Add sample authors
            authors = [
                ('J.K. Rowling', 56),
                ('George Orwell', 46),
                ('Jane Austen', 41),
                ('Stephen King', 74),
                ('Agatha Christie', 85),
                ('J.R.R. Tolkien', 81),
                ('Dan Brown', 57),
                ('Harper Lee', 89),
                ('F. Scott Fitzgerald', 44),
                ('Ernest Hemingway', 61),
                ('Mark Twain', 74),
                ('Charles Dickens', 58),
                ('Leo Tolstoy', 82),
                ('Gabriel García Márquez', 87),
                ('Virginia Woolf', 59)
            ]
            
            author_ids = {}
            for author in authors:
                cursor.execute(
                    "INSERT INTO authors (name, age) VALUES (%s, %s) RETURNING author_id",
                    author
                )
                author_id = cursor.fetchone()['author_id']
                author_ids[author[0]] = author_id
                
            # Add sample books with quantity
            books = [
                ('9780747532743', 'Harry Potter and the Philosopher\'s Stone', 223, 19.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/81m1s4wIPML._AC_UF1000,1000_QL80_.jpg', 'The first book in the Harry Potter series', 50),
                ('9780747538486', 'Harry Potter and the Chamber of Secrets', 251, 19.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/91OINeHnJGL._AC_UF1000,1000_QL80_.jpg', 'The second book in the Harry Potter series', 45),
                ('9780747546290', 'Harry Potter and the Prisoner of Azkaban', 317, 19.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/81lAPl9Fl0L._AC_UF1000,1000_QL80_.jpg', 'The third book in the Harry Potter series', 40),
                ('9780747551003', 'Harry Potter and the Goblet of Fire', 636, 24.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/81t2CVWEsUL._AC_UF1000,1000_QL80_.jpg', 'The fourth book in the Harry Potter series', 35),
                ('9780747570738', 'Harry Potter and the Order of Phoenix', 766, 24.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/71xcuT33RpL._AC_UF1000,1000_QL80_.jpg', 'The fifth book in the Harry Potter series', 30),
                ('9780747581086', 'Harry Potter and the Half-Blood Prince', 607, 24.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/61sXBXmAWML._AC_UF1000,1000_QL80_.jpg', 'The sixth book in the Harry Potter series', 25),
                ('9780545010221', 'Harry Potter and the Deathly Hallows', 607, 24.99, author_ids['J.K. Rowling'], 
                 'https://m.media-amazon.com/images/I/71sH3vxziLL._AC_UF1000,1000_QL80_.jpg', 'The seventh book in the Harry Potter series', 20),
                ('9780451524935', '1984', 328, 12.99, author_ids['George Orwell'], 
                 'https://m.media-amazon.com/images/I/71kxa1-0mfL._AC_UF1000,1000_QL80_.jpg', 'A dystopian novel by George Orwell', 30),
                ('9780452284241', 'Animal Farm', 140, 9.99, author_ids['George Orwell'], 
                 'https://m.media-amazon.com/images/I/71KV-OBJVsL._AC_UF1000,1000_QL80_.jpg', 'An allegorical novella by George Orwell', 25),
                ('9780141439518', 'Pride and Prejudice', 432, 9.99, author_ids['Jane Austen'], 
                 'https://m.media-amazon.com/images/I/71Q1tPupKjL._AC_UF1000,1000_QL80_.jpg', 'A romantic novel by Jane Austen', 25),
                ('9780141439662', 'Sense and Sensibility', 409, 9.99, author_ids['Jane Austen'], 
                 'https://m.media-amazon.com/images/I/71HTLQ-dJJL._AC_UF1000,1000_QL80_.jpg', 'A novel by Jane Austen', 20),
                ('9781501142970', 'It', 1138, 24.99, author_ids['Stephen King'], 
                 'https://m.media-amazon.com/images/I/71tFhdcC0XL._AC_UF1000,1000_QL80_.jpg', 'A horror novel about a shape-shifting entity', 20),
                ('9781501156700', 'The Shining', 447, 17.99, author_ids['Stephen King'], 
                 'https://m.media-amazon.com/images/I/81w6RyQT-TL._AC_UF1000,1000_QL80_.jpg', 'A horror novel set in an isolated hotel', 15),
                ('9780062073488', 'Murder on the Orient Express', 256, 14.99, author_ids['Agatha Christie'], 
                 'https://m.media-amazon.com/images/I/81yY5OwUQOL._AC_UF1000,1000_QL80_.jpg', 'A detective novel featuring Hercule Poirot', 15),
                ('9780062073563', 'And Then There Were None', 272, 14.99, author_ids['Agatha Christie'], 
                 'https://m.media-amazon.com/images/I/81B9LhCS2AL._AC_UF1000,1000_QL80_.jpg', 'A mystery novel by Agatha Christie', 10),
                ('9780618640157', 'The Lord of the Rings', 1178, 29.99, author_ids['J.R.R. Tolkien'], 
                 'https://m.media-amazon.com/images/I/71jLBXtWJWL._AC_UF1000,1000_QL80_.jpg', 'An epic high-fantasy novel', 20),
                ('9780547928227', 'The Hobbit', 300, 14.99, author_ids['J.R.R. Tolkien'], 
                 'https://m.media-amazon.com/images/I/710+HcoP38L._AC_UF1000,1000_QL80_.jpg', 'A fantasy novel and prequel to The Lord of the Rings', 25),
                ('9780307474278', 'The Da Vinci Code', 597, 16.99, author_ids['Dan Brown'], 
                 'https://m.media-amazon.com/images/I/81c5QZzP8aL._AC_UF1000,1000_QL80_.jpg', 'A mystery thriller novel', 30),
                ('9780060935467', 'To Kill a Mockingbird', 336, 14.99, author_ids['Harper Lee'], 
                 'https://m.media-amazon.com/images/I/71FxgtFKcQL._AC_UF1000,1000_QL80_.jpg', 'A novel about racial inequality in the American South', 35),
                ('9780743273565', 'The Great Gatsby', 180, 12.99, author_ids['F. Scott Fitzgerald'], 
                 'https://m.media-amazon.com/images/I/71FTb9X6wsL._AC_UF1000,1000_QL80_.jpg', 'A novel about the American Dream in the 1920s', 25),
                ('9780684801223', 'The Old Man and the Sea', 128, 11.99, author_ids['Ernest Hemingway'], 
                 'https://m.media-amazon.com/images/I/61Ui-IgfvdL._AC_UF1000,1000_QL80_.jpg', 'A short novel about an aging Cuban fisherman', 20),
                ('9780486280615', 'The Adventures of Huckleberry Finn', 224, 5.99, author_ids['Mark Twain'], 
                 'https://m.media-amazon.com/images/I/81wdR+2vBwL._AC_UF1000,1000_QL80_.jpg', 'A novel about a boy\'s journey down the Mississippi River', 15),
                ('9780141439563', 'A Tale of Two Cities', 489, 8.99, author_ids['Charles Dickens'], 
                 'https://m.media-amazon.com/images/I/51rVPckPtuL._AC_UF1000,1000_QL80_.jpg', 'A historical novel set during the French Revolution', 10),
                ('9780143035008', 'Anna Karenina', 864, 16.99, author_ids['Leo Tolstoy'], 
                 'https://m.media-amazon.com/images/I/91F9WKW99NL._AC_UF1000,1000_QL80_.jpg', 'A novel about an extramarital affair in Russian society', 15),
                ('9780060883287', 'One Hundred Years of Solitude', 417, 15.99, author_ids['Gabriel García Márquez'], 
                 'https://m.media-amazon.com/images/I/81MI6+TpYkL._AC_UF1000,1000_QL80_.jpg', 'A landmark of magical realism', 20),
                ('9780156030359', 'To the Lighthouse', 209, 13.99, author_ids['Virginia Woolf'], 
                 'https://m.media-amazon.com/images/I/71c1ltgBXdL._AC_UF1000,1000_QL80_.jpg', 'A modernist novel about the Ramsay family', 10)
            ]
            
            for book in books:
                cursor.execute("""
                    INSERT INTO books (isbn, name, cant_pages, price, author_id, cover_url, description, quantity) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, book)
            
            connection.commit()
            print("Sample data populated successfully")
            return True
    except Exception as error:
        print(f"Error populating sample data: {error}")
        connection.rollback()
        return False
# Authentication decorators
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page', 'warning')
            return redirect(url_for('login'))
        if not session.get('is_admin'):
            flash('You do not have permission to access this page', 'danger')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

# Authentication Routes
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Validate form data
        if not username or not email or not password:
            flash('All fields are required', 'danger')
            return render_template('signup.html')
            
        if password != confirm_password:
            flash('Passwords do not match', 'danger')
            return render_template('signup.html')
        
        # Hash the password
        password_hash = generate_password_hash(password)
        
        try:
            with connection.cursor() as cursor:
                # Check if username or email already exists
                cursor.execute("SELECT * FROM users WHERE username = %s OR email = %s", (username, email))
                existing_user = cursor.fetchone()
                
                if existing_user:
                    flash('Username or email already exists', 'danger')
                    return render_template('signup.html')
                
                # Insert new user
                cursor.execute(
                    "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING user_id",
                    (username, email, password_hash)
                )
                connection.commit()
                
                # Log the user in
                user_id = cursor.fetchone()['user_id']
                session['user_id'] = user_id
                session['username'] = username
                session['is_admin'] = False
                
                flash('Account created successfully! Welcome to Bookstore.', 'success')
                return redirect(url_for('index'))
        except Exception as error:
            print(f'Error: {error}')
            connection.rollback()
            flash('An error occurred. Please try again.', 'danger')
    
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            flash('Username and password are required', 'danger')
            return render_template('login.html')
        
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
                user = cursor.fetchone()
                
                if user and check_password_hash(user['password_hash'], password):
                    session['user_id'] = user['user_id']
                    session['username'] = user['username']
                    session['is_admin'] = user['is_admin']
                    
                    # Check if we need to populate sample data
                    cursor.execute("SELECT COUNT(*) as count FROM books")
                    book_count = cursor.fetchone()['count']
                    
                    if book_count < 10:  # If there are fewer than 10 books, populate with sample data
                        populate_sample_data()
                    
                    flash('Logged in successfully!', 'success')
                    return redirect(url_for('index'))
                else:
                    flash('Invalid username or password', 'danger')
        except Exception as error:
            print(f'Error: {error}')
            flash('An error occurred. Please try again.', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out', 'info')
    return redirect(url_for('login'))

# Frontend Routes
@app.route('/')
def index():
    try:
        with connection.cursor() as cursor:
            # Get newest books (added in the last 30 days or just the latest 6)
            cursor.execute("""
                SELECT b.*, a.name as author_name 
                FROM books b
                JOIN authors a ON b.author_id = a.author_id
                ORDER BY b.book_id DESC
                LIMIT 6
            """)
            new_books = cursor.fetchall()
            
            return render_template('index.html', new_books=new_books)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load homepage data', 'danger')
        return render_template('index.html', new_books=[])

@app.route('/authors-page')
def authors_page():
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM authors ORDER BY name")
            authors = cursor.fetchall()
            return render_template('authors.html', authors=authors)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load authors', 'danger')
        return render_template('authors.html', authors=[])

@app.route('/books-page')
def books_page():
    try:
        connection.rollback()  # Reset any aborted transactions
        with connection.cursor() as cursor:
            # Only show books with quantity greater than 0
            cursor.execute("""
                SELECT b.*, a.name as author_name 
                FROM books b 
                JOIN authors a ON b.author_id = a.author_id
                WHERE b.quantity > 0
                ORDER BY b.name
            """)
            books = cursor.fetchall()
            return render_template('books.html', books=books)
    except Exception as error:
        print(f'Error: {error}')
        connection.rollback()  # Important: rollback on error
        flash('Failed to load books', 'danger')
        return render_template('books.html', books=[])

@app.route('/book/<int:book_id>')
def book_detail(book_id):
    try:
        connection.rollback()  # Reset any aborted transactions
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT b.*, a.name as author_name,
                       COALESCE(b.quantity, 0) as quantity
                FROM books b 
                JOIN authors a ON b.author_id = a.author_id
                WHERE b.book_id = %s
            """, (book_id,))
            book = cursor.fetchone()
            
            # Check if book is in user's favorites
            is_favorite = False
            if 'user_id' in session:
                cursor.execute("""
                    SELECT * FROM favorites 
                    WHERE user_id = %s AND book_id = %s
                """, (session['user_id'], book_id))
                is_favorite = cursor.fetchone() is not None
            
            if not book:
                flash('Book not found', 'danger')
                return redirect(url_for('books_page'))
                
            return render_template('book_detail.html', book=book, is_favorite=is_favorite)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load book details', 'danger')
        return redirect(url_for('books_page'))

# Admin Routes
@app.route('/add-author', methods=['GET', 'POST'])
@admin_required
def add_author():
    if request.method == 'POST':
        try:
            name = request.form.get('name')
            age = request.form.get('age')
            
            if not name or not age:
                flash('Name and age are required', 'danger')
                return redirect(url_for('add_author'))
                
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO authors (name, age) VALUES (%s, %s) RETURNING author_id",
                    (name, int(age))
                )
                connection.commit()
                flash('Author added successfully', 'success')
                return redirect(url_for('authors_page'))
        except Exception as error:
            print(f'Error: {error}')
            connection.rollback()
            flash('Failed to add author', 'danger')
            
    return render_template('add_author.html')

@app.route('/add-book', methods=['GET', 'POST'])
@admin_required
def add_book():
    if request.method == 'POST':
        isbn = request.form.get('isbn')
        title = request.form.get('title')
        pages = request.form.get('pages')
        price = request.form.get('price')
        author_id = request.form.get('author')
        cover_url = request.form.get('cover_url')
        description = request.form.get('description')
        quantity = request.form.get('quantity', 0)  # Get quantity with default 0
        
        # Validate form data
        if not isbn or not title or not author_id:
            flash('ISBN, title and author are required', 'danger')
            return redirect(url_for('add_book'))
        
        try:
            with connection.cursor() as cursor:
                # Insert new book with quantity
                cursor.execute("""
                    INSERT INTO books (isbn, name, cant_pages, price, author_id, cover_url, description, quantity) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (isbn, title, pages, price, author_id, cover_url, description, quantity))
                connection.commit()
                flash('Book added successfully!', 'success')
                return redirect(url_for('books_page'))
        except Exception as error:
            print(f'Error: {error}')
            connection.rollback()
            flash('Failed to add book', 'danger')
    
    # GET request - show form
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM authors ORDER BY name")
            authors = cursor.fetchall()
            return render_template('add_book.html', authors=authors)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load authors', 'danger')
        return render_template('add_book.html', authors=[])

@app.route('/edit-book/<int:book_id>', methods=['GET', 'POST'])
@admin_required
def edit_book(book_id):
    if request.method == 'POST':
        isbn = request.form.get('isbn')
        title = request.form.get('title')
        pages = request.form.get('pages')
        price = request.form.get('price')
        author_id = request.form.get('author')
        cover_url = request.form.get('cover_url')
        description = request.form.get('description')
        quantity = request.form.get('quantity', 0)  # Get quantity with default 0
        
        # Validate form data
        if not isbn or not title or not author_id:
            flash('ISBN, title and author are required', 'danger')
            return redirect(url_for('edit_book', book_id=book_id))
        
        try:
            with connection.cursor() as cursor:
                # Update book with quantity
                cursor.execute("""
                    UPDATE books 
                    SET isbn = %s, name = %s, cant_pages = %s, price = %s, 
                        author_id = %s, cover_url = %s, description = %s, quantity = %s
                    WHERE book_id = %s
                """, (isbn, title, pages, price, author_id, cover_url, description, quantity, book_id))
                connection.commit()
                flash('Book updated successfully!', 'success')
                return redirect(url_for('book_detail', book_id=book_id))
        except Exception as error:
            print(f'Error: {error}')
            connection.rollback()
            flash('Failed to update book', 'danger')
    
    # GET request - show form with book data
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT b.*, a.name as author_name 
                FROM books b 
                JOIN authors a ON b.author_id = a.author_id
                WHERE b.book_id = %s
            """, (book_id,))
            book = cursor.fetchone()
            
            if not book:
                flash('Book not found', 'danger')
                return redirect(url_for('books_page'))
            
            cursor.execute("SELECT * FROM authors ORDER BY name")
            authors = cursor.fetchall()
            
            return render_template('edit_book.html', book=book, authors=authors)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load book data', 'danger')
        return redirect(url_for('books_page'))

@app.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    try:
        with connection.cursor() as cursor:
            # Get total books
            cursor.execute("SELECT COUNT(*) as total_books FROM books")
            total_books = cursor.fetchone()['total_books']
            
            # Get total authors
            cursor.execute("SELECT COUNT(*) as total_authors FROM authors")
            total_authors = cursor.fetchone()['total_authors']
            
            # Get total users
            cursor.execute("SELECT COUNT(*) as total_users FROM users WHERE is_admin = FALSE")
            total_users = cursor.fetchone()['total_users']
            
            # Get total orders
            cursor.execute("SELECT COUNT(*) as total_orders FROM orders")
            total_orders = cursor.fetchone()['total_orders']
            
            # Get total revenue
            cursor.execute("SELECT SUM(total_amount) as total_revenue FROM orders")
            result = cursor.fetchone()
            total_revenue = result['total_revenue'] if result['total_revenue'] else 0
            
            # Get low stock books (less than 5)
            try:
                cursor.execute("""
                    SELECT b.*, a.name as author_name 
                    FROM books b 
                    JOIN authors a ON b.author_id = a.author_id
                    WHERE b.quantity < 5
                    ORDER BY b.quantity ASC
                """)
                low_stock_books = cursor.fetchall()
            except Exception as e:
                print(f"Error fetching low stock books: {e}")
                low_stock_books = []
            
            # Get all books for management
            cursor.execute("""
                SELECT b.*, a.name as author_name 
                FROM books b 
                JOIN authors a ON b.author_id = a.author_id
                ORDER BY b.book_id ASC
            """)
            all_books = cursor.fetchall()
            
            # Get recent orders
            cursor.execute("""
                SELECT o.*, u.username 
                FROM orders o 
                JOIN users u ON o.user_id = u.user_id
                ORDER BY o.order_date DESC
                LIMIT 5
            """)
            recent_orders = cursor.fetchall()
            
            return render_template('admin_dashboard.html', 
                                  total_books=total_books,
                                  total_authors=total_authors,
                                  total_users=total_users,
                                  total_orders=total_orders,
                                  total_revenue=total_revenue,
                                  low_stock_books=low_stock_books,
                                  all_books=all_books,
                                  recent_orders=recent_orders)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load dashboard data', 'danger')
        return render_template('admin_dashboard.html')

@app.route('/admin/sales-report')
@admin_required
def sales_report():
    try:
        with connection.cursor() as cursor:
            # Get monthly sales data
            cursor.execute("""
                SELECT 
                    DATE_TRUNC('month', order_date) as month,
                    SUM(total_amount) as revenue,
                    COUNT(*) as order_count
                FROM orders
                GROUP BY month
                ORDER BY month DESC
            """)
            monthly_sales = cursor.fetchall()
            
            # Get top selling books
            cursor.execute("""
                SELECT 
                    b.name as book_name,
                    SUM(oi.quantity) as total_sold,
                    SUM(oi.quantity * oi.price) as total_revenue
                FROM order_items oi
                JOIN books b ON oi.book_id = b.book_id
                GROUP BY b.name
                ORDER BY total_sold DESC
                LIMIT 10
            """)
            top_books = cursor.fetchall()
            
            return render_template('sales_report.html', 
                                  monthly_sales=monthly_sales,
                                  top_books=top_books)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to generate sales report', 'danger')
        return render_template('sales_report.html')

# User Cart Routes
@app.route('/cart')
@login_required
def view_cart():
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT c.cart_id, c.quantity, b.*, a.name as author_name,
                       (b.price * c.quantity) as total_price
                FROM cart_items c
                JOIN books b ON c.book_id = b.book_id
                JOIN authors a ON b.author_id = a.author_id
                WHERE c.user_id = %s
            """, (session['user_id'],))
            cart_items = cursor.fetchall()
            
            # Calculate cart total
            total = sum(item['total_price'] for item in cart_items)
            
            return render_template('cart.html', cart_items=cart_items, total=total)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load cart', 'danger')
        return render_template('cart.html', cart_items=[], total=0)

@app.route('/add-to-cart/<int:book_id>', methods=['POST'])
@login_required
def add_to_cart(book_id):
    try:
        quantity = int(request.form.get('quantity', 1))
        
        with connection.cursor() as cursor:
            # Check if book exists and has enough stock
            cursor.execute("SELECT * FROM books WHERE book_id = %s", (book_id,))
            book = cursor.fetchone()
            
            if not book:
                flash('Book not found', 'danger')
                return redirect(url_for('books_page'))
                
            if book['quantity'] < quantity:
                flash(f'Not enough stock. Only {book["quantity"]} available.', 'warning')
                return redirect(url_for('book_detail', book_id=book_id))
            
            # Check if item already in cart
            cursor.execute(
                "SELECT * FROM cart_items WHERE user_id = %s AND book_id = %s",
                (session['user_id'], book_id)
            )
            cart_item = cursor.fetchone()
            
            if cart_item:
                # Update quantity if already in cart
                new_quantity = cart_item['quantity'] + quantity
                cursor.execute(
                    "UPDATE cart_items SET quantity = %s WHERE cart_id = %s",
                    (new_quantity, cart_item['cart_id'])
                )
            else:
                # Add new item to cart
                cursor.execute(
                    "INSERT INTO cart_items (user_id, book_id, quantity) VALUES (%s, %s, %s)",
                    (session['user_id'], book_id, quantity)
                )
                
            connection.commit()
            flash('Book added to cart', 'success')
            return redirect(url_for('view_cart'))
    except Exception as error:
        print(f'Error: {error}')
        connection.rollback()
        flash('Failed to add book to cart', 'danger')
        return redirect(url_for('book_detail', book_id=book_id))

@app.route('/update-cart/<int:cart_id>', methods=['POST'])
@login_required
def update_cart(cart_id):
    try:
        quantity = int(request.form.get('quantity', 1))
        
        with connection.cursor() as cursor:
            # Get cart item and check ownership
            cursor.execute("""
                SELECT c.*, b.quantity as book_quantity 
                FROM cart_items c
                JOIN books b ON c.book_id = b.book_id
                WHERE c.cart_id = %s
            """, (cart_id,))
            cart_item = cursor.fetchone()
            
            if not cart_item or cart_item['user_id'] != session['user_id']:
                flash('Cart item not found', 'danger')
                return redirect(url_for('view_cart'))
                
            # Check stock
            if quantity > cart_item['book_quantity']:
                flash(f'Not enough stock. Only {cart_item["book_quantity"]} available.', 'warning')
                return redirect(url_for('view_cart'))
                
            if quantity <= 0:
                # Remove item if quantity is 0 or less
                cursor.execute("DELETE FROM cart_items WHERE cart_id = %s", (cart_id,))
                flash('Item removed from cart', 'success')
            else:
                # Update quantity
                cursor.execute(
                    "UPDATE cart_items SET quantity = %s WHERE cart_id = %s",
                    (quantity, cart_id)
                )
                flash('Cart updated', 'success')
                
            connection.commit()
            return redirect(url_for('view_cart'))
    except Exception as error:
        print(f'Error: {error}')
        connection.rollback()
        flash('Failed to update cart', 'danger')
        return redirect(url_for('view_cart'))

@app.route('/remove-from-cart/<int:cart_id>', methods=['POST'])
@login_required
def remove_from_cart(cart_id):
    try:
        with connection.cursor() as cursor:
            # Check ownership
            cursor.execute(
                "SELECT * FROM cart_items WHERE cart_id = %s AND user_id = %s",
                (cart_id, session['user_id'])
            )
            cart_item = cursor.fetchone()
            
            if not cart_item:
                flash('Cart item not found', 'danger')
                return redirect(url_for('view_cart'))
                
            # Remove item
            cursor.execute("DELETE FROM cart_items WHERE cart_id = %s", (cart_id,))
            connection.commit()
            
            flash('Item removed from cart', 'success')
            return redirect(url_for('view_cart'))
    except Exception as error:
        print(f'Error: {error}')
        connection.rollback()
        flash('Failed to remove item from cart', 'danger')
        return redirect(url_for('view_cart'))

@app.route('/checkout', methods=['GET', 'POST'])
@login_required
def checkout():
    if request.method == 'POST':
        try:
            with connection.cursor() as cursor:
                # Get cart items
                cursor.execute("""
                    SELECT c.cart_id, c.book_id, c.quantity, b.name as book_name, 
                           b.price, b.quantity as stock
                    FROM cart_items c
                    JOIN books b ON c.book_id = b.book_id
                    WHERE c.user_id = %s
                """, (session['user_id'],))
                cart_items = cursor.fetchall()
                
                if not cart_items:
                    flash('Your cart is empty', 'warning')
                    return redirect(url_for('view_cart'))
                
                # Check stock for all items
                for item in cart_items:
                    if item['quantity'] > item['stock']:
                        flash(f'Not enough stock for {item["book_name"]}. Only {item["stock"]} available.', 'danger')
                        return redirect(url_for('view_cart'))
                
                # Calculate total
                total_amount = sum(item['price'] * item['quantity'] for item in cart_items)
                
                # Create order
                cursor.execute(
                    "INSERT INTO orders (user_id, total_amount) VALUES (%s, %s) RETURNING order_id",
                    (session['user_id'], total_amount)
                )
                order_id = cursor.fetchone()['order_id']
                
                # Add order items and update book quantities
                for item in cart_items:
                    # Add to order items
                    cursor.execute("""
                        INSERT INTO order_items (order_id, book_id, quantity, price, book_name)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (order_id, item['book_id'], item['quantity'], item['price'], item['book_name']))
                    
                    # Update book quantity
                    cursor.execute(
                        "UPDATE books SET quantity = quantity - %s WHERE book_id = %s",
                        (item['quantity'], item['book_id'])
                    )
                
                # Clear cart
                cursor.execute("DELETE FROM cart_items WHERE user_id = %s", (session['user_id'],))
                
                connection.commit()
                flash('Order placed successfully!', 'success')
                return redirect(url_for('order_confirmation', order_id=order_id))
        except Exception as error:
            print(f'Error: {error}')
            connection.rollback()
            flash('Failed to process order', 'danger')
            return redirect(url_for('view_cart'))
    
    # GET request - show checkout page
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT c.cart_id, c.quantity, b.*, a.name as author_name,
                       (b.price * c.quantity) as total_price
                FROM cart_items c
                JOIN books b ON c.book_id = b.book_id
                JOIN authors a ON b.author_id = a.author_id
                WHERE c.user_id = %s
            """, (session['user_id'],))
            cart_items = cursor.fetchall()
            
            # Calculate cart total
            total = sum(item['total_price'] for item in cart_items)
            
            return render_template('checkout.html', cart_items=cart_items, total=total)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load checkout page', 'danger')
        return redirect(url_for('view_cart'))

@app.route('/order-confirmation/<int:order_id>')
@login_required
def order_confirmation(order_id):
    try:
        with connection.cursor() as cursor:
            # Get order details
            cursor.execute("""
                SELECT o.*, u.username
                FROM orders o
                JOIN users u ON o.user_id = u.user_id
                WHERE o.order_id = %s AND o.user_id = %s
            """, (order_id, session['user_id']))
            order = cursor.fetchone()
            
            if not order:
                flash('Order not found', 'danger')
                return redirect(url_for('my_orders'))
                
            # Get order items
            cursor.execute("""
                SELECT * FROM order_items WHERE order_id = %s
            """, (order_id,))
            order_items = cursor.fetchall()
            
            return render_template('order_confirmation.html', order=order, order_items=order_items)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load order confirmation', 'danger')
        return redirect(url_for('index'))

@app.route('/my-orders')
@login_required
def my_orders():
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT * FROM orders
                WHERE user_id = %s
                ORDER BY order_date DESC
            """, (session['user_id'],))
            orders = cursor.fetchall()
            
            return render_template('my_orders.html', orders=orders)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load orders', 'danger')
        return render_template('my_orders.html', orders=[])

@app.route('/order/<int:order_id>')
@login_required
def order_detail(order_id):
    try:
        with connection.cursor() as cursor:
            # Get order details
            cursor.execute("""
                SELECT o.*, u.username
                FROM orders o
                JOIN users u ON o.user_id = u.user_id
                WHERE o.order_id = %s AND (o.user_id = %s OR %s)
            """, (order_id, session['user_id'], session.get('is_admin', False)))
            order = cursor.fetchone()
            
            if not order:
                flash('Order not found', 'danger')
                return redirect(url_for('my_orders'))
                
            # Get order items
            cursor.execute("""
                SELECT oi.*, b.cover_url
                FROM order_items oi
                LEFT JOIN books b ON oi.book_id = b.book_id
                WHERE oi.order_id = %s
            """, (order_id,))
            order_items = cursor.fetchall()
            
            return render_template('order_detail.html', order=order, order_items=order_items)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load order details', 'danger')
        return redirect(url_for('my_orders'))

@app.route('/order-details/<int:order_id>')
@login_required
def order_details(order_id):
    try:
        with connection.cursor() as cursor:
            # Get order details
            cursor.execute("""
                SELECT * FROM orders
                WHERE order_id = %s AND user_id = %s
            """, (order_id, session['user_id']))
            order = cursor.fetchone()
            
            if not order:
                flash('Order not found', 'danger')
                return redirect(url_for('my_orders'))
            
            # Get order items
            cursor.execute("""
                SELECT oi.*, b.cover_url
                FROM order_items oi
                LEFT JOIN books b ON oi.book_id = b.book_id
                WHERE oi.order_id = %s
            """, (order_id,))
            order_items = cursor.fetchall()

            return render_template('order_details.html', order=order, order_items=order_items)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load order details', 'danger')
        return redirect(url_for('my_orders'))
    
@app.route('/favorites-view')
@login_required
def favorites_view():
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT f.favorite_id, b.*, a.name as author_name
                FROM favorites f
                JOIN books b ON f.book_id = b.book_id
                JOIN authors a ON b.author_id = a.author_id
                WHERE f.user_id = %s
                ORDER BY f.added_at DESC
            """, (session['user_id'],))
            favorites = cursor.fetchall()
            
            return render_template('favorites.html', favorites=favorites)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load favorites', 'danger')
        return render_template('favorites.html', favorites=[])

@app.route('/add-to-favorites/<int:book_id>', methods=['POST'])
@login_required
def add_to_favorites(book_id):
    try:
        with connection.cursor() as cursor:
            # Check if book exists
            cursor.execute("SELECT * FROM books WHERE book_id = %s", (book_id,))
            book = cursor.fetchone()
            
            if not book:
                flash('Book not found', 'danger')
                return redirect(url_for('books_page'))
                
            # Check if already in favorites
            cursor.execute(
                "SELECT * FROM favorites WHERE user_id = %s AND book_id = %s",
                (session['user_id'], book_id)
            )
            favorite = cursor.fetchone()
            
            if favorite:
                flash('Book already in favorites', 'info')
            else:
                # Add to favorites
                cursor.execute(
                    "INSERT INTO favorites (user_id, book_id) VALUES (%s, %s)",
                    (session['user_id'], book_id)
                )
                connection.commit()
                flash('Book added to favorites', 'success')
                
            return redirect(url_for('book_detail', book_id=book_id))
    except Exception as error:
        print(f'Error: {error}')
        connection.rollback()
        flash('Failed to add book to favorites', 'danger')
        return redirect(url_for('book_detail', book_id=book_id))

@app.route('/remove-from-favorites/<int:favorite_id>', methods=['POST'])
@login_required
def remove_from_favorites(favorite_id):
    try:
        with connection.cursor() as cursor:
            # Check ownership
            cursor.execute(
                "SELECT * FROM favorites WHERE favorite_id = %s AND user_id = %s",
                (favorite_id, session['user_id'])
            )
            favorite = cursor.fetchone()
            
            if not favorite:
                flash('Favorite not found', 'danger')
                return redirect(url_for('favorites_view'))
                
            # Remove from favorites
            cursor.execute("DELETE FROM favorites WHERE favorite_id = %s", (favorite_id,))
            connection.commit()
            
            flash('Book removed from favorites', 'success')
            return redirect(url_for('favorites_view'))
    except Exception as error:
        print(f'Error: {error}')
        connection.rollback()
        flash('Failed to remove book from favorites', 'danger')
        return redirect(url_for('favorites_view'))
@app.route('/make-admin/<int:user_id>', methods=['POST'])
@admin_required
def make_admin(user_id):
    try:
        with connection.cursor() as cursor:
            cursor.execute("UPDATE users SET is_admin = TRUE WHERE user_id = %s", (user_id,))
            connection.commit()
            flash('User promoted to admin', 'success')
            return redirect(url_for('admin_dashboard'))
    except Exception as error:
        print(f'Error: {error}')
        connection.rollback()
        flash('Failed to promote user', 'danger')
        return redirect(url_for('admin_dashboard'))

@app.route('/admin/users')
@admin_required
def admin_users():
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT * FROM users
                ORDER BY created_at DESC
            """)
            users = cursor.fetchall()
            return render_template('admin_users.html', users=users)
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load users data', 'danger')
        return render_template('admin_users.html', users=[])

def close_connection():
    if 'connection' in globals():
        connection.close()
        print("Database connection closed")

# Register close_connection to run on exit
atexit.register(close_connection)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=port, debug=True)

# Admin setup route - visit this URL once to create admin user
@app.route('/setup-admin')
def setup_admin():
    try:
        with connection.cursor() as cursor:
            # Check if admin already exists
            cursor.execute("SELECT * FROM users WHERE username = %s", ('admin',))
            user = cursor.fetchone()
            
            if user:
                # Update existing admin password
                password_hash = generate_password_hash('admin123')
                cursor.execute(
                    "UPDATE users SET password_hash = %s, is_admin = TRUE WHERE username = %s",
                    (password_hash, 'admin')
                )
                connection.commit()
                return "Admin password reset successfully! You can now login with username 'admin' and password 'admin123'."
            else:
                # Create new admin user
                password_hash = generate_password_hash('admin123')
                cursor.execute(
                    "INSERT INTO users (username, email, password_hash, is_admin) VALUES (%s, %s, %s, %s)",
                    ('admin', 'admin@example.com', password_hash, True)
                )
                connection.commit()
                return "Admin user created successfully! You can now login with username 'admin' and password 'admin123'."
    except Exception as error:
        print(f'Error: {error}')
        connection.rollback()
        return f"Error creating admin: {error}"

@app.route('/favorites', methods=['GET', 'POST'])
@login_required
def favorites():
    if request.method == 'POST':
        # Handle adding/removing favorites (POST request)
        try:
            book_id = request.form.get('book_id')
            with connection.cursor() as cursor:
                # Toggle favorite
                cursor.execute("""
                    SELECT * FROM favorites 
                    WHERE user_id = %s AND book_id = %s
                """, (session['user_id'], book_id))
                
                if cursor.fetchone():
                    cursor.execute("""
                        DELETE FROM favorites 
                        WHERE user_id = %s AND book_id = %s
                    """, (session['user_id'], book_id))
                else:
                    cursor.execute("""
                        INSERT INTO favorites (user_id, book_id)
                        VALUES (%s, %s)
                    """, (session['user_id'], book_id))
                
                connection.commit()
                return redirect(url_for('book_detail', book_id=book_id))
                
        except Exception as error:
            print(f'Error: {error}')
            connection.rollback()
            flash('Failed to update favorites', 'danger')
            return redirect(url_for('book_detail', book_id=book_id))
    
    # Handle viewing favorites (GET request)
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT b.*, a.name as author_name 
                FROM favorites f
                JOIN books b ON f.book_id = b.book_id
                JOIN authors a ON b.author_id = a.author_id
                WHERE f.user_id = %s
                ORDER BY f.added_at DESC
            """, (session['user_id'],))
            favorite_books = cursor.fetchall()
            
            return render_template('favorites.html', favorite_books=favorite_books)
            
    except Exception as error:
        print(f'Error: {error}')
        flash('Failed to load favorites', 'danger')
        return render_template('favorites.html', favorite_books=[])

# Add a new route for deleting books
@app.route('/delete-book/<int:book_id>')
@admin_required
def delete_book(book_id):
    try:
        with connection.cursor() as cursor:
            # First check if the book exists
            cursor.execute("SELECT * FROM books WHERE book_id = %s", (book_id,))
            book = cursor.fetchone()
            
            if not book:
                flash('Book not found', 'danger')
                return redirect(url_for('admin_dashboard'))
            
            # Delete the book
            cursor.execute("DELETE FROM books WHERE book_id = %s", (book_id,))
            connection.commit()
            
            flash('Book deleted successfully', 'success')
    except Exception as error:
        print(f'Error: {error}')
        connection.rollback()
        flash('Failed to delete book', 'danger')
    
    return redirect(url_for('admin_dashboard'))

def close_connection():
    if 'connection' in globals():
        connection.close()
        print("Database connection closed")

# Register close_connection to run on exit
atexit.register(close_connection)

@app.route('/populate-sample-data')
def populate_sample_data_route():
    if populate_sample_data():
        flash('Sample data populated successfully!', 'success')
    else:
        flash('Failed to populate sample data', 'danger')
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=port, debug=True)
