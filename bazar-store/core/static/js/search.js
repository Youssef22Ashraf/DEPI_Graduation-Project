/**
 * Search and History Module
 * Handles book search functionality and purchase history display
 */

/**
 * Search for books by topic
 * @param {string} topic - The topic to search for
 */
function searchBooks(topic) {
    // Hide the featured books section when searching
    document.querySelector('.featured-books').style.display = 'none';
    
    document.getElementById('results').innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    // Handle special category pages
    let searchTerm = topic;
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

                    const bookCard = document.createElement('div');
                    bookCard.className = 'col-md-4 mb-4';
                    bookCard.innerHTML = `
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
                    `;
                    results.appendChild(bookCard);
                });
            } else {
                const noResults = document.createElement('div');
                noResults.className = 'col-12 text-center';
                noResults.innerHTML = '<p>No books found for this topic.</p>';
                results.appendChild(noResults);
            }
        })
        .catch(error => {
            console.error('Error searching books:', error);
            document.getElementById('results').innerHTML = `
                <div class="col-12 text-center">
                    <p>Error searching for books: ${error.message}</p>
                </div>
            `;
        });
}

/**
 * Show purchase history in a modal
 */
function showPurchaseHistory() {
    const historyBody = document.getElementById('historyBody');
    historyBody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>';
    
    // Show the modal while loading
    const historyModal = new bootstrap.Modal(document.getElementById('historyModal'));
    historyModal.show();
    
    // Fetch purchase history
    fetch('/api/orders')
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            historyBody.innerHTML = '';
            
            if (data.orders && data.orders.length > 0) {
                data.orders.forEach(order => {
                    const date = new Date(order.timestamp);
                    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                    
                    historyBody.innerHTML += `
                        <tr>
                            <td>${order.order_id}</td>
                            <td>${order.title}</td>
                            <td>${formattedDate}</td>
                            <td>$${parseFloat(order.price).toFixed(2)}</td>
                        </tr>
                    `;
                });
            } else {
                historyBody.innerHTML = '<tr><td colspan="4" class="text-center">No purchase history found.</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error fetching purchase history:', error);
            historyBody.innerHTML = `<tr><td colspan="4" class="text-center">Error loading purchase history: ${error.message}</td></tr>`;
        });
}

// Export functions for use in other scripts
window.searchBooks = searchBooks;
window.showPurchaseHistory = showPurchaseHistory;