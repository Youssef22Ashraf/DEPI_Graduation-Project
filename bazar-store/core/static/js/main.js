/**
 * Main JavaScript file for Bazar.com
 * Contains core functionality for the bookstore website
 */

// Global variables
let currentBookId = null;
let currentBookDetails = null;

// Modal instances
let bookModal = null;
let purchaseModal = null;
let stockModal = null;
let historyModal = null;

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap modals
    bookModal = new bootstrap.Modal(document.getElementById('bookModal'));
    purchaseModal = new bootstrap.Modal(document.getElementById('purchaseConfirmModal'));
    stockModal = new bootstrap.Modal(document.getElementById('stockModal'));
    historyModal = new bootstrap.Modal(document.getElementById('historyModal'));
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Load the home page content
    loadHomePage();
    
    // Initialize cart badge
    updateCartBadge();
    
    // Add event listener for cart modal to update cart display when opened
    const cartModalElement = document.getElementById('cartModal');
    if (cartModalElement) {
        cartModalElement.addEventListener('show.bs.modal', function () {
            if (window.specialOffers && window.specialOffers.updateCartDisplay) {
                window.specialOffers.updateCartDisplay();
            }
        });
    }
});

/**
 * Initialize event listeners for the page
 */
function initializeEventListeners() {
    // Search input event listener for Enter key
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchByInput();
            }
        });
    }
    
    // Purchase button event listener
    const purchaseBtn = document.getElementById('purchaseBtn');
    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', () => {
            if (currentBookId) {
                bookModal.hide();
                purchaseModal.show();
            }
        });
    }
    
    // Add stock button event listener
    const addStockBtn = document.getElementById('addStockBtn');
    if (addStockBtn) {
        addStockBtn.addEventListener('click', () => {
            if (currentBookId && currentBookDetails) {
                document.getElementById('stockBookDetails').innerHTML = `
                    <h6>${currentBookDetails.title}</h6>
                    <p class="text-muted small">Current stock: ${currentBookDetails.quantity}</p>
                `;
                bookModal.hide();
                stockModal.show();
            }
        });
    }
    
    // Confirm add stock button event listener
    const confirmAddStockBtn = document.getElementById('confirmAddStockBtn');
    if (confirmAddStockBtn) {
        confirmAddStockBtn.addEventListener('click', () => {
            addStock();
        });
    }
    
    // Confirm purchase button event listener
    const confirmPurchaseBtn = document.getElementById('confirmPurchaseBtn');
    if (confirmPurchaseBtn) {
        confirmPurchaseBtn.addEventListener('click', () => {
            const shippingAddress = document.getElementById('shippingAddress').value.trim();
            const paymentMethod = document.getElementById('paymentMethod').value;
            
            if (!shippingAddress) {
                // Add validation feedback
                document.getElementById('shippingAddress').classList.add('is-invalid');
                if (!document.querySelector('.invalid-feedback-address')) {
                    const feedback = document.createElement('div');
                    feedback.className = 'invalid-feedback invalid-feedback-address';
                    feedback.textContent = 'Please enter a shipping address';
                    document.getElementById('shippingAddress').parentNode.appendChild(feedback);
                }
                return;
            } else {
                document.getElementById('shippingAddress').classList.remove('is-invalid');
                const feedback = document.querySelector('.invalid-feedback-address');
                if (feedback) feedback.remove();
            }
            
            if (!paymentMethod) {
                // Add validation feedback
                document.getElementById('paymentMethod').classList.add('is-invalid');
                if (!document.querySelector('.invalid-feedback-payment')) {
                    const feedback = document.createElement('div');
                    feedback.className = 'invalid-feedback invalid-feedback-payment';
                    feedback.textContent = 'Please select a payment method';
                    document.getElementById('paymentMethod').parentNode.appendChild(feedback);
                }
                return;
            } else {
                document.getElementById('paymentMethod').classList.remove('is-invalid');
                const feedback = document.querySelector('.invalid-feedback-payment');
                if (feedback) feedback.remove();
            }
            
            if (currentBookId) purchaseBook(currentBookId, shippingAddress, paymentMethod);
        });
    }
}

/**
 * Search for books by topic
 * @param {string} topic - The topic to search for
 */
function searchBooks(topic) {
    // Hide the featured books section when searching
    const featuredSection = document.querySelector('.featured-books');
    if (featuredSection) {
        featuredSection.style.display = 'none';
    }
    
    const resultsElement = document.getElementById('results');
    if (!resultsElement) return;
    
    resultsElement.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    let searchTerm = topic;
    
    // Handle special category pages
    if (topic === 'best sellers') {
        // Show the most popular book - Designing Data-Intensive Applications
        fetch('/api/info/5') // ID of Designing Data-Intensive Applications
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! Status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                const results = document.getElementById('results');
                results.innerHTML = '<h3 class="col-12 mb-4">Best Sellers</h3>';
                
                if (data.book) {
                    const book = data.book;
                    const stockClass = book.quantity < 5 ? 'low' : '';
                    const stockText = book.quantity < 5 ? `Only ${book.quantity} left!` : `${book.quantity} in stock`;

                    results.innerHTML += `
                        <div class="col-md-6 mx-auto mb-4">
                            <div class="card book-card">
                                <div class="card-body">
                                    <h5 class="card-title">${book.title}</h5>
                                    <h6 class="card-subtitle mb-2 text-muted">${book.author}</h6>
                                    <p class="card-text">${book.description}</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="book-price">$${parseFloat(book.price).toFixed(2)}</span>
                                        <span class="book-stock ${stockClass}">${stockText}</span>
                                    </div>
                                    <button class="btn btn-outline-primary mt-3 w-100" onclick="showBookDetails(${book.id})">View Details</button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    results.innerHTML += '<div class="col-12 text-center"><p>Best seller information not available.</p></div>';
                }
            })
            .catch(error => {
                console.error('Error fetching best seller:', error);
                document.getElementById('results').innerHTML = '<div class="col-12 text-center"><p>Error loading best seller information: ' + error.message + '</p></div>';
            });
        return;
    } else if (topic === 'new releases') {
        // Show the newest books
        searchTerm = 'distributed systems';
    } else if (topic === 'special offers') {
        searchTerm = 'undergraduate school';
    }
    
    // Create a heading for the search results
    const searchHeading = document.createElement('h3');
    searchHeading.className = 'col-12 mb-4';
    searchHeading.textContent = `Search Results for "${topic}"`;
    
    // Use fetch with proper error handling
    fetch(`/api/search/${encodeURIComponent(searchTerm)}`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            const results = document.getElementById('results');
            results.innerHTML = '';
            
            // Add the heading to results
            results.appendChild(searchHeading);

            if (data.books && data.books.length > 0) {
                data.books.forEach(book => {
                    const stockClass = book.quantity < 5 ? 'low' : '';
                    const stockText = book.quantity < 5 ? `Only ${book.quantity} left!` : `${book.quantity} in stock`;

                    results.innerHTML += `
                        <div class="col-md-4 mb-4">
                            <div class="card book-card">
                                <div class="card-body">
                                    <h5 class="card-title">${book.title}</h5>
                                    <h6 class="card-subtitle mb-2 text-muted">${book.author}</h6>
                                    <p class="card-text">${book.description.substring(0, 100)}...</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="book-price">$${parseFloat(book.price).toFixed(2)}</span>
                                        <span class="book-stock ${stockClass}">${stockText}</span>
                                    </div>
                                    <button class="btn btn-outline-primary mt-3 w-100" onclick="showBookDetails(${book.id})">View Details</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
            } else {
                results.innerHTML += '<div class="col-12 text-center"><p>No books found for "' + topic + '"</p></div>';
            }
        })
        .catch(error => {
            console.error('Search error:', error);
            document.getElementById('results').innerHTML = '<div class="col-12 text-center"><p>Error searching for books: ' + error.message + '</p></div>';
        });
}

/**
 * Search for books based on the input field value
 */
function searchByInput() {
    const topic = document.getElementById('searchInput').value.trim();
    if (topic) searchBooks(topic);
}

/**
 * Load the home page content
 */
function loadHomePage() {
    // Clear the results area to prepare for featured content
    const resultsElement = document.getElementById('results');
    if (!resultsElement) return;
    
    resultsElement.innerHTML = '';
    
    // The featured books section is already in the HTML, so we just need to
    // make sure it's visible and load some recommended books
    const featuredSection = document.querySelector('.featured-books');
    if (featuredSection) {
        featuredSection.style.display = 'block';
    }
    
    // Load some recommended books in the results area
    fetch('/api/search/recommended')
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data.books && data.books.length > 0) {
                const resultsDiv = document.getElementById('results');
                resultsDiv.innerHTML = '<h3 class="col-12 mb-4">Recommended For You</h3>';
                
                data.books.forEach(book => {
                    const stockClass = book.quantity < 5 ? 'low' : '';
                    const stockText = book.quantity < 5 ? `Only ${book.quantity} left!` : `${book.quantity} in stock`;

                    resultsDiv.innerHTML += `
                        <div class="col-md-4 mb-4">
                            <div class="card book-card">
                                <div class="card-body">
                                    <h5 class="card-title">${book.title}</h5>
                                    <h6 class="card-subtitle mb-2 text-muted">${book.author}</h6>
                                    <p class="card-text">${book.description.substring(0, 100)}...</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="book-price">$${parseFloat(book.price).toFixed(2)}</span>
                                        <span class="book-stock ${stockClass}">${stockText}</span>
                                    </div>
                                    <button class="btn btn-outline-primary mt-3 w-100" onclick="showBookDetails(${book.id})">View Details</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
            } else {
                document.getElementById('results').innerHTML = '<div class="col-12 text-center"><p>No recommended books available at the moment.</p></div>';
            }
        })
        .catch(error => {
            console.error('Error loading recommended books:', error);
            document.getElementById('results').innerHTML = '<div class="col-12 text-center"><p>Error loading recommended books: ' + error.message + '</p></div>';
        });
}

/**
 * Show book details in a modal
 * @param {number} bookId - The ID of the book to show details for
 */
function showBookDetails(bookId) {
    if (!bookId) return;
    
    currentBookId = bookId;
    
    fetch(`/api/info/${bookId}`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data.book) {
                currentBookDetails = data.book;
                const book = data.book;
                const stockClass = book.quantity < 5 ? 'text-danger' : 'text-success';
                const stockText = book.quantity < 5 ? `Only ${book.quantity} left!` : `${book.quantity} in stock`;
                
                document.getElementById('modalTitle').textContent = book.title;
                document.getElementById('modalBody').innerHTML = `
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="text-muted">${book.author}</h6>
                            <p>${book.description}</p>
                            <p><strong>Topic:</strong> ${book.topic}</p>
                            <p><strong>Price:</strong> <span class="text-primary">$${parseFloat(book.price).toFixed(2)}</span></p>
                            <p><strong>Stock:</strong> <span class="${stockClass}">${stockText}</span></p>
                        </div>
                        <div class="col-md-4">
                            <div class="d-grid gap-2">
                                <button class="btn btn-success" id="addToCartBtn">Add to Cart</button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add event listener for the Add to Cart button
                setTimeout(() => {
                    const addToCartBtn = document.getElementById('addToCartBtn');
                    if (addToCartBtn) {
                        addToCartBtn.addEventListener('click', () => {
                            window.specialOffers.addToCart(book);
                        });
                    }
                }, 100);
                
                // Show or hide the Add Stock button based on whether we're in admin mode
                const addStockBtn = document.getElementById('addStockBtn');
                if (addStockBtn) {
                    // For demo purposes, always show the button
                    addStockBtn.style.display = 'block';
                }
                
                bookModal.show();
            } else {
                alert('Book information not available');
            }
        })
        .catch(error => {
            console.error('Error fetching book details:', error);
            alert('Error loading book details: ' + error.message);
        });
}

/**
 * Purchase a book
 * @param {number} bookId - The ID of the book to purchase
 * @param {string} shippingAddress - The shipping address
 * @param {string} paymentMethod - The payment method
 */
function purchaseBook(bookId, shippingAddress, paymentMethod) {
    if (!bookId || !shippingAddress || !paymentMethod) return;
    
    const purchaseData = {
        shipping_address: shippingAddress,
        payment_method: paymentMethod
    };
    
    fetch(`/api/purchase/${bookId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(purchaseData)
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(errData => {
                throw new Error(errData.message || `Error: ${res.status} ${res.statusText}`);
            });
        }
        return res.json();
    })
    .then(data => {
        if (data.success) {
            purchaseModal.hide();
            alert('Purchase successful! Thank you for your order.');
            
            // Update the book quantity in the UI
            if (currentBookDetails) {
                currentBookDetails.quantity -= 1;
                // Refresh the current view to show updated stock
                showBookDetails(currentBookId);
            }
        } else {
            throw new Error(data.message || 'Purchase could not be completed');
        }
    })
    .catch(error => {
        console.error('Purchase error:', error);
        alert('Error processing purchase: ' + error.message);
    });
}

/**
 * Add stock to a book
 */
function addStock() {
    const quantityToAdd = parseInt(document.getElementById('stockQuantity').value);
    
    if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
        alert('Please enter a valid quantity');
        return;
    }
    
    // Create stock data object
    const stockData = {
        item_id: currentBookId,
        quantity: quantityToAdd
    };
    
    fetch('/api/catalog/add-stock', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(stockData)
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(errData => {
                throw new Error(errData.message || `Error: ${res.status} ${res.statusText}`);
            });
        }
        return res.json();
    })
    .then(data => {
        if (data.success) {
            stockModal.hide();
            alert('Stock updated successfully!');
            
            // Update the book quantity in the UI
            if (currentBookDetails) {
                currentBookDetails.quantity = data.book.quantity;
                // Refresh the current view to show updated stock
                showBookDetails(currentBookId);
            }
        } else {
            throw new Error(data.message || 'Stock update could not be completed');
        }
    })
    .catch(error => {
        console.error('Stock update error:', error);
        alert('Error updating stock: ' + error.message);
    });
}

/**
 * Show purchase history
 */
function showPurchaseHistory() {
    fetch('/api/orders')
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            const historyBody = document.getElementById('historyBody');
            historyBody.innerHTML = '';

            if (data.orders && data.orders.length > 0) {
                let orderProcessed = 0;
                const totalOrders = data.orders.length;
                
                data.orders.forEach(order => {
                    // Fetch order details to get the book information
                    fetch(`/api/orders/${order.order_id}`)
                        .then(res => {
                            if (!res.ok) {
                                throw new Error(`HTTP error! Status: ${res.status}`);
                            }
                            return res.json();
                        })
                        .then(orderData => {
                            orderProcessed++;
                            if (orderData.items && orderData.items.length > 0) {
                                orderData.items.forEach(item => {
                                    historyBody.innerHTML += `
                                        <tr>
                                            <td>${order.order_id}</td>
                                            <td>${item.title}</td>
                                            <td>${new Date(order.order_date).toLocaleDateString()}</td>
                                            <td>$${parseFloat(item.price).toFixed(2)}</td>
                                        </tr>
                                    `;
                                });
                            }
                            
                            // If all orders processed and no items were found
                            if (orderProcessed === totalOrders && historyBody.innerHTML === '') {
                                historyBody.innerHTML = '<tr><td colspan="4" class="text-center">No purchase history items found</td></tr>';
                            }
                        })
                        .catch(error => {
                            console.error(`Error fetching order details for order ${order.order_id}:`, error);
                            orderProcessed++;
                            
                            // If all orders processed and no items were found
                            if (orderProcessed === totalOrders && historyBody.innerHTML === '') {
                                historyBody.innerHTML = '<tr><td colspan="4" class="text-center">Error loading some order details</td></tr>';
                            }
                        });
                });
            } else {
                historyBody.innerHTML = '<tr><td colspan="4" class="text-center">No purchase history found</td></tr>';
            }

            historyModal.show();
        })
        .catch(error => {
            console.error('Error fetching purchase history:', error);
            document.getElementById('historyBody').innerHTML = 
                '<tr><td colspan="4" class="text-center">Error loading purchase history: ' + error.message + '</td></tr>';
            historyModal.show();
        });
}

/**
 * Update the cart badge with the current number of items
 */
function updateCartBadge() {
    const cartBadge = document.getElementById('cartBadge');
    if (cartBadge) {
        const cartItems = window.specialOffers ? window.specialOffers.getCartItems() : [];
        const count = cartItems.length;
        cartBadge.textContent = count;
        cartBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

// Export functions for use in other scripts
window.searchBooks = searchBooks;
window.searchByInput = searchByInput;
window.showBookDetails = showBookDetails;
window.showPurchaseHistory = showPurchaseHistory;
window.updateCartBadge = updateCartBadge;