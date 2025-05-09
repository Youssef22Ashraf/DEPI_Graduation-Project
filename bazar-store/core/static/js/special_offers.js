/**
 * Special Offers Module
 * Handles the logic for special offers, such as discounts for purchasing multiple books from the same category
 */

// Store the current cart items
// Initialize from localStorage if available
let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];

// Special offer configuration
const specialOffers = {
    sameCategory: {
        minItems: 2,  // Minimum number of items from the same category to qualify
        discountPercentage: 15,  // 15% discount
        description: "Buy 2 or more books from the same category and get 15% off!"
    }
};

/**
 * Save cart items to localStorage
 */
function saveCartToLocalStorage() {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
}

/**
 * Get the current special offers for display
 * @returns {Array} - Array of special offer descriptions
 */
function getSpecialOffers() {
    return [
        specialOffers.sameCategory.description
    ];
}

/**
 * Add a book to the cart
 * @param {Object} book - The book object to add to the cart
 */
function addToCart(book) {
    cartItems.push(book);
    saveCartToLocalStorage();
    updateCartDisplay();
}

/**
 * Remove a book from the cart
 * @param {number} index - The index of the book to remove
 */
function removeFromCart(index) {
    cartItems.splice(index, 1);
    saveCartToLocalStorage();
    updateCartDisplay();
}

/**
 * Clear the cart
 */
function clearCart() {
    cartItems = [];
    saveCartToLocalStorage();
    updateCartDisplay();
}

/**
 * Calculate the total price of items in the cart, applying any applicable discounts
 * @returns {Object} - Object containing subtotal, discount, and total
 */
function calculateTotal() {
    // Group books by category
    const booksByCategory = {};
    
    // Calculate subtotal and group books
    let subtotal = 0;
    cartItems.forEach(book => {
        subtotal += parseFloat(book.price);
        
        // Group by category
        if (!booksByCategory[book.topic]) {
            booksByCategory[book.topic] = [];
        }
        booksByCategory[book.topic].push(book);
    });
    
    // Check for special offers
    let discount = 0;
    let appliedOffers = [];
    
    // Check for same category discount
    for (const category in booksByCategory) {
        const booksInCategory = booksByCategory[category];
        if (booksInCategory.length >= specialOffers.sameCategory.minItems) {
            // Calculate discount for this category
            const categorySubtotal = booksInCategory.reduce((sum, book) => sum + parseFloat(book.price), 0);
            const categoryDiscount = categorySubtotal * (specialOffers.sameCategory.discountPercentage / 100);
            discount += categoryDiscount;
            
            appliedOffers.push({
                type: 'sameCategory',
                category: category,
                count: booksInCategory.length,
                discount: categoryDiscount
            });
        }
    }
    
    // Calculate final total
    const total = subtotal - discount;
    
    return {
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        appliedOffers: appliedOffers
    };
}

/**
 * Update the cart display in the UI
 */
function updateCartDisplay() {
    const cartContainer = document.getElementById('cartItems');
    if (!cartContainer) return;
    
    // Update cart badge count
    const cartBadge = document.getElementById('cartBadge');
    if (cartBadge) {
        cartBadge.textContent = cartItems.length;
        cartBadge.style.display = cartItems.length > 0 ? 'inline-block' : 'none';
        
        // Add animation class if items were added
        if (cartItems.length > 0) {
            cartBadge.classList.add('animate__animated', 'animate__bounceIn');
            setTimeout(() => {
                cartBadge.classList.remove('animate__animated', 'animate__bounceIn');
            }, 1000);
        }
    }
    
    // Display available special offers
    displaySpecialOffers();
    
    // Clear current cart display
    cartContainer.innerHTML = '';
    
    if (cartItems.length === 0) {
        cartContainer.innerHTML = '<p class="text-center">Your cart is empty</p>';
        document.getElementById('cartTotal').innerHTML = '$0.00';
        document.getElementById('checkoutBtn').disabled = true;
        
        // Hide discount section if visible
        const discountSection = document.getElementById('discountSection');
        if (discountSection) discountSection.style.display = 'none';
        
        return;
    }
    
    // Add each item to the cart display
    cartItems.forEach((book, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item d-flex justify-content-between align-items-center mb-2';
        itemElement.innerHTML = `
            <div>
                <h6 class="mb-0">${book.title}</h6>
                <small class="text-muted">${book.author}</small>
            </div>
            <div class="d-flex align-items-center">
                <span class="me-3">$${parseFloat(book.price).toFixed(2)}</span>
                <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        cartContainer.appendChild(itemElement);
    });
    
    // Calculate and display total
    const totals = calculateTotal();
    
    // Update or create discount section
    let discountSection = document.getElementById('discountSection');
    if (!discountSection) {
        discountSection = document.createElement('div');
        discountSection.id = 'discountSection';
        discountSection.className = 'mt-3 mb-3';
        document.getElementById('cartContainer').insertBefore(discountSection, document.getElementById('cartFooter'));
    }
    
    // Show or hide discount section based on whether there's a discount
    if (parseFloat(totals.discount) > 0) {
        let discountHtml = '<div class="alert alert-success">';
        discountHtml += '<h6 class="alert-heading">Special Offers Applied!</h6>';
        
        // Display each applied offer
        totals.appliedOffers.forEach(offer => {
            if (offer.type === 'sameCategory') {
                discountHtml += `<p class="mb-0 small">Category Discount: ${specialOffers.sameCategory.discountPercentage}% off ${offer.count} books in "${offer.category}" category</p>`;
            }
        });
        
        discountHtml += '</div>';
        discountHtml += `<div class="d-flex justify-content-between">
            <span>Subtotal:</span>
            <span>$${totals.subtotal}</span>
        </div>`;
        discountHtml += `<div class="d-flex justify-content-between text-success">
            <span>Discount:</span>
            <span>-$${totals.discount}</span>
        </div>`;
        
        discountSection.innerHTML = discountHtml;
        discountSection.style.display = 'block';
    } else {
        discountSection.style.display = 'none';
    }
    
    // Update total
    document.getElementById('cartTotal').innerHTML = `$${totals.total}`;
    document.getElementById('checkoutBtn').disabled = false;
}

/**
 * Process the checkout
 */
function checkout() {
    if (cartItems.length === 0) {
        // Show a message if cart is empty
        const errorMessage = document.getElementById('errorMessage') || document.createElement('div');
        errorMessage.textContent = 'Your cart is empty. Please add items before checkout.';
        const errorModal = new bootstrap.Modal(document.getElementById('purchaseErrorModal'));
        errorModal.show();
        return;
    }
    
    // Get shipping and payment information
    const shippingAddress = document.getElementById('shippingAddress').value.trim();
    const paymentMethod = document.getElementById('paymentMethod').value;
    const customerEmail = document.getElementById('customerEmail') ? document.getElementById('customerEmail').value.trim() : '';
    const phoneNumber = document.getElementById('phoneNumber') ? document.getElementById('phoneNumber').value.trim() : '';
    let isValid = true;
    
    // Reset validation state for all fields
    const formFields = ['shippingAddress', 'paymentMethod', 'customerEmail', 'phoneNumber'];
    formFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.classList.remove('is-invalid');
            const feedbackElement = document.getElementById(`${field}Feedback`);
            if (feedbackElement) feedbackElement.textContent = '';
        }
    });
    
    // Validate shipping address (must be at least 10 characters)
    if (!shippingAddress || shippingAddress.length < 10) {
        const element = document.getElementById('shippingAddress');
        element.classList.add('is-invalid');
        const feedbackElement = document.getElementById('shippingAddressFeedback');
        if (feedbackElement) {
            feedbackElement.textContent = !shippingAddress ? 'Shipping address is required' : 'Please enter a complete address (at least 10 characters)';
        }
        isValid = false;
    }
    
    // Validate payment method
    if (!paymentMethod) {
        const element = document.getElementById('paymentMethod');
        element.classList.add('is-invalid');
        const feedbackElement = document.getElementById('paymentMethodFeedback');
        if (feedbackElement) feedbackElement.textContent = 'Please select a payment method';
        isValid = false;
    }
    
    // Validate email if present in the form
    if (document.getElementById('customerEmail')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!customerEmail || !emailRegex.test(customerEmail)) {
            const element = document.getElementById('customerEmail');
            element.classList.add('is-invalid');
            const feedbackElement = document.getElementById('customerEmailFeedback');
            if (feedbackElement) {
                feedbackElement.textContent = !customerEmail ? 'Email is required' : 'Please enter a valid email address';
            }
            isValid = false;
        }
    }
    
    // Validate phone number if present in the form
    if (document.getElementById('phoneNumber')) {
        const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
        if (phoneNumber && !phoneRegex.test(phoneNumber)) {
            const element = document.getElementById('phoneNumber');
            element.classList.add('is-invalid');
            const feedbackElement = document.getElementById('phoneNumberFeedback');
            if (feedbackElement) {
                feedbackElement.textContent = 'Please enter a valid phone number';
            }
            isValid = false;
        }
    }
    
    if (!isValid) {
        // Add shake animation to invalid fields for better user feedback
        const invalidFields = document.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => {
            field.classList.add('animate__animated', 'animate__shakeX');
            setTimeout(() => {
                field.classList.remove('animate__animated', 'animate__shakeX');
            }, 1000);
        });
        
        // Focus on the first invalid field
        if (invalidFields.length > 0) {
            invalidFields[0].focus();
        }
        
        // Show validation error toast
        showToast('Please correct the highlighted fields before proceeding', 'danger', 5000);
        
        return;
    }
    
    // Calculate totals and discounts
    const totals = calculateTotal();
    const purchasePromises = [];
    
    // Group books by category for discount calculation
    const booksByCategory = {};
    cartItems.forEach(book => {
        if (!booksByCategory[book.topic]) {
            booksByCategory[book.topic] = [];
        }
        booksByCategory[book.topic].push(book);
    });
    
    // Process each book purchase with the appropriate discount information
    cartItems.forEach(book => {
        // Check if this book is part of a category discount
        const categoryDiscount = booksByCategory[book.topic].length >= specialOffers.sameCategory.minItems;
        
        // Create purchase data object with discount information
        const purchaseData = {
            shipping_address: shippingAddress,
            payment_method: paymentMethod,
            customer_email: customerEmail || '',
            phone_number: phoneNumber || '',
            cart_items: cartItems.map(item => ({
                id: item.id,
                topic: item.topic,
                price: item.price
            })),
            discount_info: {
                has_discount: categoryDiscount,
                category: book.topic,
                category_count: booksByCategory[book.topic].length,
                discount_percentage: specialOffers.sameCategory.discountPercentage
            }
        };
        
        // Make the purchase request
        const promise = fetch(`/api/purchase/${book.id}`, {
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
        });
        
        purchasePromises.push(promise);
    });
    
    // Wait for all purchases to complete
    Promise.all(purchasePromises)
        .then(results => {
            // Check if all purchases were successful
            const allSuccessful = results.every(result => result.success);
            
            if (allSuccessful) {
                // Show success message with discount information
                const cartModal = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
                if (cartModal) cartModal.hide();
                
                // Check if any purchase had a discount applied
                const discountedPurchase = results.find(result => result.discount_applied);
                
                // Show discount information if applicable
                if (discountedPurchase) {
                    const discountInfoElement = document.getElementById('purchaseDiscountInfo');
                    const discountMessageElement = document.getElementById('discountMessage');
                    
                    if (discountInfoElement && discountMessageElement) {
                        discountInfoElement.style.display = 'block';
                        discountMessageElement.textContent = discountedPurchase.discount_message || 
                            `You saved $${discountedPurchase.discount_amount.toFixed(2)} with our ${discountedPurchase.discount_percentage}% category discount!`;
                    }
                }
                
                // Show success modal instead of alert
                const successModal = new bootstrap.Modal(document.getElementById('purchaseSuccessModal'));
                successModal.show();
                
                // Clear the cart
                clearCart();
            } else {
                // Show error message
                const errorMessage = document.getElementById('errorMessage');
                if (errorMessage) {
                    errorMessage.textContent = 'Some purchases could not be completed. Please try again.';
                }
                const errorModal = new bootstrap.Modal(document.getElementById('purchaseErrorModal'));
                errorModal.show();
            }
        })
        .catch(error => {
            console.error('Purchase error:', error);
            const errorMessage = document.getElementById('errorMessage');
            if (errorMessage) {
                errorMessage.textContent = 'Error processing purchases: ' + error.message;
            }
            const errorModal = new bootstrap.Modal(document.getElementById('purchaseErrorModal'));
            errorModal.show();
        });
}

/**
 * Display special offers in the UI
 */
function displaySpecialOffers() {
    const offersList = getSpecialOffers();
    const specialOffersElements = document.querySelectorAll('.special-offers-container');
    
    specialOffersElements.forEach(container => {
        container.innerHTML = '';
        
        if (offersList.length > 0) {
            const offerElement = document.createElement('div');
            offerElement.className = 'alert alert-info';
            offerElement.innerHTML = `
                <h6 class="alert-heading"><i class="bi bi-tags-fill"></i> Special Offers Available!</h6>
                <ul class="mb-0 small">
                    ${offersList.map(offer => `<li>${offer}</li>`).join('')}
                </ul>
            `;
            container.appendChild(offerElement);
        }
    });
}

// Initialize special offers display and cart when page loads
document.addEventListener('DOMContentLoaded', () => {
    displaySpecialOffers();
    updateCartDisplay(); // Update cart display with items from localStorage
});

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, danger, warning, info)
 * @param {number} duration - How long to show the toast in milliseconds
 * @returns {HTMLElement} - The toast container element
 */
function showToast(message, type = 'success', duration = 3000) {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '11';
    toastContainer.innerHTML = `
        <div class="toast align-items-center text-white bg-${type}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-info-circle me-2"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    document.body.appendChild(toastContainer);
    
    const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'), {
        delay: duration
    });
    toast.show();
    
    // Remove the toast after it's hidden
    toastContainer.querySelector('.toast').addEventListener('hidden.bs.toast', () => {
        toastContainer.remove();
    });
    
    return toastContainer;
}

// Export functions for use in other scripts
window.specialOffers = {
    addToCart,
    removeFromCart,
    clearCart,
    calculateTotal,
    checkout,
    displaySpecialOffers,
    getSpecialOffers,
    showToast,
    getCartItems: function() {
        return cartItems;
    }
};