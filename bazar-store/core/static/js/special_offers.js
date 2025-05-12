/**
 * Special Offers Module
 * Handles the logic for special offers, such as discounts for purchasing multiple books from the same category
 */

// Store the current cart items
let cartItems = JSON.parse(localStorage.getItem("cartItems")) || []

// Special offer configuration
const specialOffers = {
  sameCategory: {
    minItems: 2,
    discountPercentage: 15,
    description: "Buy 2 or more books from the same category and get 15% off!",
  },
}

/**
 * Get form field values from the cart modal
 * @returns {Object} - Object containing form field values
 */
function getCartFormValues() {
  return {
    shippingAddress: document.getElementById("cart-shipping-address")?.value.trim(),
    paymentMethod: document.getElementById("cart-payment-method")?.value,
    customerEmail: document.getElementById("cart-customer-email")?.value.trim(),
    phoneNumber: document.getElementById("cart-phone-number")?.value.trim() || "",
  }
}

/**
 * Save cart items to localStorage
 */
function saveCartToLocalStorage() {
  try {
    localStorage.setItem("cartItems", JSON.stringify(cartItems))
    console.log("Cart saved to localStorage:", cartItems)
  } catch (e) {
    console.error("Error saving cart to localStorage:", e)
  }
}

/**
 * Get the current special offers for display
 * @returns {Array} - Array of special offer descriptions
 */
function getSpecialOffers() {
  return [specialOffers.sameCategory.description]
}

/**
 * Get cart items
 * @returns {Array} - Array of cart items
 */
function getCartItems() {
  return cartItems
}

/**
 * Add a book to the cart
 * @param {Object} book - The book object to add to the cart
 */
function addToCart(book) {
  // Ensure book has all required properties
  const bookToAdd = {
    id: book.id,
    title: book.title,
    author: book.author,
    price: book.price,
    topic: book.topic || "General",
    quantity: 1,
  }

  // Log the book being added
  console.log("Adding book to cart:", bookToAdd)

  cartItems.push(bookToAdd)
  saveCartToLocalStorage()
  updateCartDisplay()
  updateCartBadge()
  showToast("Book added to cart!", "success")
}

/**
 * Remove a book from the cart
 * @param {number} index - The index of the book to remove
 */
function removeFromCart(index) {
  cartItems.splice(index, 1)
  saveCartToLocalStorage()
  updateCartDisplay()
  updateCartBadge()
  showToast("Book removed from cart", "info")
}

/**
 * Clear the cart
 */
function clearCart() {
  cartItems = []
  saveCartToLocalStorage()
  updateCartDisplay()
  updateCartBadge()
  showToast("Cart cleared", "info")
}

/**
 * Calculate the total price of items in the cart, applying any applicable discounts
 * @returns {Object} - Object containing subtotal, discount, and total
 */
function calculateTotal() {
  const booksByCategory = {}
  let subtotal = 0
  cartItems.forEach((book) => {
    subtotal += Number.parseFloat(book.price)
    if (!booksByCategory[book.topic]) {
      booksByCategory[book.topic] = []
    }
    booksByCategory[book.topic].push(book)
  })

  let discount = 0
  const appliedOffers = []
  for (const category in booksByCategory) {
    const booksInCategory = booksByCategory[category]
    if (booksInCategory.length >= specialOffers.sameCategory.minItems) {
      const categorySubtotal = booksInCategory.reduce((sum, book) => sum + Number.parseFloat(book.price), 0)
      const categoryDiscount = categorySubtotal * (specialOffers.sameCategory.discountPercentage / 100)
      discount += categoryDiscount
      appliedOffers.push({
        type: "sameCategory",
        category: category,
        count: booksInCategory.length,
        discount: categoryDiscount,
      })
    }
  }

  const total = subtotal - discount
  return {
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    total: total.toFixed(2),
    appliedOffers: appliedOffers,
  }
}

/**
 * Update the cart display in the UI
 */
function updateCartDisplay() {
  console.log("Updating cart display, items:", cartItems)

  const cartContainer = document.getElementById("cartItems")
  if (!cartContainer) {
    console.error("Cart container not found in DOM")
    return
  }

  // Ensure cartItems is an array and reload from localStorage
  try {
    cartItems = JSON.parse(localStorage.getItem("cartItems")) || []
    console.log("Cart items loaded from localStorage:", cartItems)
  } catch (e) {
    console.error("Error parsing cart items from localStorage:", e)
    cartItems = []
    saveCartToLocalStorage()
  }

  displaySpecialOffers()
  cartContainer.innerHTML = ""
  if (cartItems.length === 0) {
    console.log("Cart is empty, displaying empty message")
    cartContainer.innerHTML = '<p class="text-center">Your cart is empty</p>'
    document.getElementById("cartTotal").innerHTML = "$0.00"
    document.getElementById("checkoutBtn").disabled = true
    const discountSection = document.getElementById("discountSection")
    if (discountSection) discountSection.style.display = "none"
    return
  }

  cartItems.forEach((book, index) => {
    const itemElement = document.createElement("div")
    itemElement.className = "cart-item d-flex justify-content-between align-items-center mb-2"
    itemElement.innerHTML = `
            <div>
                <h6 class="mb-0">${book.title}</h6>
                <small class="text-muted">${book.author}</small>
            </div>
            <div class="d-flex align-items-center">
                <span class="me-3">$${Number.parseFloat(book.price).toFixed(2)}</span>
                <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `
    cartContainer.appendChild(itemElement)
  })

  const totals = calculateTotal()
  let discountSection = document.getElementById("discountSection")
  if (!discountSection) {
    discountSection = document.createElement("div")
    discountSection.id = "discountSection"
    discountSection.className = "mt-3 mb-3"
    const cartContainer = document.getElementById("cartContainer")
    if (cartContainer) {
      cartContainer.insertBefore(
        discountSection,
        document.querySelector(".d-flex.justify-content-between.align-items-center.border-top"),
      )
    }
  }

  if (Number.parseFloat(totals.discount) > 0) {
    let discountHtml = '<div class="alert alert-success">'
    discountHtml += '<h6 class="alert-heading">Special Offers Applied!</h6>'
    totals.appliedOffers.forEach((offer) => {
      if (offer.type === "sameCategory") {
        discountHtml += `<p class="mb-0 small">Category Discount: ${specialOffers.sameCategory.discountPercentage}% off ${offer.count} books in "${offer.category}" category</p>`
      }
    })
    discountHtml += "</div>"
    discountHtml += `<div class="d-flex justify-content-between">
            <span>Subtotal:</span>
            <span>$${totals.subtotal}</span>
        </div>`
    discountHtml += `<div class="d-flex justify-content-between text-success">
            <span>Discount:</span>
            <span>-$${totals.discount}</span>
        </div>`
    discountSection.innerHTML = discountHtml
    discountSection.style.display = "block"
  } else {
    discountSection.style.display = "none"
  }

  document.getElementById("cartTotal").innerHTML = `$${totals.total}`
  document.getElementById("checkoutBtn").disabled = false
}

/**
 * Process the checkout
 */
function checkout() {
  if (cartItems.length === 0) {
    showToast("Your cart is empty. Please add items before checkout.", "danger", 5000)
    return
  }

  const { shippingAddress, paymentMethod, customerEmail, phoneNumber } = getCartFormValues()
  let isValid = true

  // Reset validation state
  const formFields = ["cart-shipping-address", "cart-payment-method", "cart-customer-email"]
  formFields.forEach((field) => {
    const element = document.getElementById(field)
    if (element) {
      element.classList.remove("is-invalid")
    }
  })

  // Validate shipping address
  if (!shippingAddress || shippingAddress.length < 5) {
    const element = document.getElementById("cart-shipping-address")
    if (element) {
      element.classList.add("is-invalid")
      isValid = false
    }
  }

  // Validate payment method
  if (!paymentMethod) {
    const element = document.getElementById("cart-payment-method")
    if (element) {
      element.classList.add("is-invalid")
      isValid = false
    }
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!customerEmail || !emailRegex.test(customerEmail)) {
    const element = document.getElementById("cart-customer-email")
    if (element) {
      element.classList.add("is-invalid")
      isValid = false
    }
  }

  // Validate phone (if provided)
  if (phoneNumber) {
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/
    if (!phoneRegex.test(phoneNumber)) {
      const element = document.getElementById("cart-phone-number")
      if (element) {
        element.classList.add("is-invalid")
        isValid = false
      }
    }
  }

  if (!isValid) {
    const invalidFields = document.querySelectorAll(".is-invalid")
    if (invalidFields.length > 0) {
      invalidFields[0].focus()
    }
    showToast("Please correct the highlighted fields before proceeding", "danger", 5000)
    return
  }

  // Clean up any leftover modal backdrops before proceeding
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.remove())
  document.body.classList.remove("modal-open")
  document.body.style.overflow = ""
  document.body.style.paddingRight = ""

  // Show loading overlay
  document.getElementById("loadingOverlay").style.display = "flex"

  // Calculate totals and prepare discount info
  const totals = calculateTotal()
  const booksByCategory = {}

  // Group books by category
  cartItems.forEach((book) => {
    if (!booksByCategory[book.topic]) {
      booksByCategory[book.topic] = []
    }
    booksByCategory[book.topic].push(book)
  })

  // Process each book purchase sequentially
  processPurchases(cartItems, 0, [], {
    shippingAddress,
    paymentMethod,
    customerEmail,
    phoneNumber,
    booksByCategory,
  })
}

/**
 * Process purchases sequentially to avoid race conditions
 * @param {Array} items - Cart items to purchase
 * @param {number} index - Current item index
 * @param {Array} results - Results from previous purchases
 * @param {Object} purchaseInfo - Common purchase information
 */
function processPurchases(items, index, results, purchaseInfo) {
  if (index >= items.length) {
    // All purchases completed
    handlePurchaseResults(results)
    return
  }

  const book = items[index]
  const { shippingAddress, paymentMethod, customerEmail, phoneNumber, booksByCategory } = purchaseInfo

  // Check if category discount applies
  const categoryDiscount = booksByCategory[book.topic].length >= specialOffers.sameCategory.minItems

  const purchaseData = {
    shipping_address: shippingAddress,
    payment_method: paymentMethod,
    customer_email: customerEmail,
    phone_number: phoneNumber,
    discount_info: {
      has_discount: categoryDiscount,
      category: book.topic,
      category_count: booksByCategory[book.topic].length,
      discount_percentage: specialOffers.sameCategory.discountPercentage,
    },
  }

  // Make the purchase request
  fetch(`/api/purchase/${book.id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(purchaseData),
  })
    .then((res) => {
      if (!res.ok) {
        return res.json().then((errData) => {
          throw new Error(errData.message || `Error: ${res.status} ${res.statusText}`)
        })
      }
      return res.json()
    })
    .then((result) => {
      // Add result and process next item
      results.push(result)
      processPurchases(items, index + 1, results, purchaseInfo)
    })
    .catch((error) => {
      console.error(`Error purchasing ${book.title}:`, error)
      // Add error result and continue with next item
      results.push({ success: false, error: error.message, book: book })
      processPurchases(items, index + 1, results, purchaseInfo)
    })
}

/**
 * Reset UI state after modal operations
 * This helps prevent the UI from freezing after modal interactions
 */
function resetUIState() {
  // Remove any modal backdrops
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.remove())

  // Remove modal open class from body
  document.body.classList.remove("modal-open")

  // Reset body styles that Bootstrap adds
  document.body.style.overflow = ""
  document.body.style.paddingRight = ""
}

/**
 * Handle the results of all purchase operations
 * @param {Array} results - Results from all purchases
 */
function handlePurchaseResults(results) {
  // Hide loading overlay
  document.getElementById("loadingOverlay").style.display = "none"

  // Reset UI state first to prevent freezing
  resetUIState()

  const successfulPurchases = results.filter((result) => result.success)
  const failedPurchases = results.filter((result) => !result.success)

  if (successfulPurchases.length > 0) {
    // Close cart modal
    const cartModalElement = document.getElementById("cartModal")
    const cartModal = bootstrap.Modal.getInstance(cartModalElement)
    if (cartModal) {
      cartModal.hide()
      // Force dispose the cart modal to prevent memory leaks
      setTimeout(() => {
        try {
          cartModal.dispose()
        } catch (e) {
          console.log("Cart modal already disposed")
        }
      }, 500)
    }

    // Check for discounts
    const discountedPurchase = successfulPurchases.find((result) => result.discount_applied)
    if (discountedPurchase) {
      const discountInfoElement = document.getElementById("purchaseDiscountInfo")
      const discountMessageElement = document.getElementById("discountMessage")
      if (discountInfoElement && discountMessageElement) {
        discountInfoElement.style.display = "block"
        discountMessageElement.textContent =
          discountedPurchase.discount_message ||
          `You saved $${discountedPurchase.discount_amount.toFixed(2)} with our ${discountedPurchase.discount_percentage}% category discount!`
      }
    }

    // Remove successful purchases from cart
    if (successfulPurchases.length === cartItems.length) {
      clearCart()
    } else {
      // Remove only successful purchases
      const successfulIds = successfulPurchases.map((result) => result.book_id)
      cartItems = cartItems.filter((item) => !successfulIds.includes(item.id))
      saveCartToLocalStorage()
      updateCartDisplay()
      updateCartBadge()
    }

    // Show success modal with proper event handling
    const successModalElement = document.getElementById("purchaseSuccessModal")

    // Ensure any existing modal instance is disposed before creating a new one
    const existingSuccessModal = bootstrap.Modal.getInstance(successModalElement)
    if (existingSuccessModal) {
      try {
        existingSuccessModal.dispose()
      } catch (e) {
        console.log("Success modal already disposed")
      }
    }

    const successModal = new bootstrap.Modal(successModalElement)

    // Add event listener for when modal is hidden
    successModalElement.addEventListener(
      "hidden.bs.modal",
      () => {
        // Reset UI state after modal is closed
        resetUIState()
        // Allow time for the DOM to update
        setTimeout(() => {
          try {
            successModal.dispose()
          } catch (e) {
            console.log("Success modal already disposed")
          }
        }, 300)
      },
      { once: true },
    ) // Use once:true so event listener is automatically removed after execution

    successModal.show()

    showToast(`Successfully purchased ${successfulPurchases.length} item(s)!`, "success", 5000)
  }

  if (failedPurchases.length > 0) {
    const errorMessage = document.getElementById("errorMessage")
    if (errorMessage) {
      errorMessage.textContent =
        failedPurchases.length === 1
          ? `Failed to purchase "${failedPurchases[0].book?.title}": ${failedPurchases[0].error}`
          : `Failed to purchase ${failedPurchases.length} item(s). Please try again.`
    }

    const errorModalElement = document.getElementById("purchaseErrorModal")

    // Ensure any existing modal instance is disposed before creating a new one
    const existingErrorModal = bootstrap.Modal.getInstance(errorModalElement)
    if (existingErrorModal) {
      try {
        existingErrorModal.dispose()
      } catch (e) {
        console.log("Error modal already disposed")
      }
    }

    const errorModal = new bootstrap.Modal(errorModalElement)

    // Add event listener for when modal is hidden
    errorModalElement.addEventListener(
      "hidden.bs.modal",
      () => {
        // Reset UI state after modal is closed
        resetUIState()
        // Allow time for the DOM to update
        setTimeout(() => {
          try {
            errorModal.dispose()
          } catch (e) {
            console.log("Error modal already disposed")
          }
        }, 300)
      },
      { once: true },
    ) // Use once:true so event listener is automatically removed after execution

    errorModal.show()
  }
}

/**
 * Display special offers in the UI
 */
function displaySpecialOffers() {
  const offersList = getSpecialOffers()
  const specialOffersElements = document.querySelectorAll(".special-offers-container")
  specialOffersElements.forEach((container) => {
    container.innerHTML = ""
    if (offersList.length > 0) {
      const offerElement = document.createElement("div")
      offerElement.className = "alert alert-info"
      offerElement.innerHTML = `
                <h6 class="alert-heading"><i class="bi bi-tags-fill"></i> Special Offers Available!</h6>
                <ul class="mb-0 small">
                    ${offersList.map((offer) => `<li>${offer}</li>`).join("")}
                </ul>
            `
      container.appendChild(offerElement)
    }
  })
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, danger, warning, info)
 * @param {number} duration - How long to show the toast in milliseconds
 * @returns {HTMLElement} - The toast container element
 */
function showToast(message, type = "success", duration = 3000) {
  // Use the showToast function from main.js if available
  if (window.showToast) {
    return window.showToast(message, type, duration)
  }

  // Fallback implementation
  console.log(`Toast: ${message} (${type})`)

  // Create toast container
  const toastContainer = document.createElement("div")
  toastContainer.className = "position-fixed bottom-0 end-0 p-3 toast-container"
  toastContainer.style.zIndex = "11"
  toastContainer.innerHTML = `
        <div class="toast align-items-center text-white bg-${type}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-info-circle me-2"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `
  document.body.appendChild(toastContainer)

  const toast = new bootstrap.Toast(toastContainer.querySelector(".toast"), {
    delay: duration,
  })
  toast.show()

  toastContainer.querySelector(".toast").addEventListener("hidden.bs.toast", () => {
    toastContainer.remove()
  })

  return toastContainer
}

/**
 * Update the cart badge in the UI
 */
function updateCartBadge() {
  const cartBadge = document.getElementById("cartBadge")
  if (!cartBadge) return

  // If items have quantity property, use it, otherwise count each item as 1
  const totalItems =
    cartItems.length > 0 && cartItems[0].quantity
      ? cartItems.reduce((sum, item) => sum + item.quantity, 0)
      : cartItems.length

  cartBadge.textContent = totalItems
  cartBadge.style.display = totalItems > 0 ? "inline-block" : "none"
}

// Add event listeners to modal close buttons to ensure proper cleanup
document.addEventListener("DOMContentLoaded", () => {
  // Add event listeners to all modal close buttons
  document.querySelectorAll('[data-bs-dismiss="modal"]').forEach((button) => {
    button.addEventListener("click", () => {
      // Reset UI state when any modal is manually closed
      setTimeout(resetUIState, 300)
    })
  })

  // Add event listener to continue shopping button in success modal
  const continueShoppingBtn = document.querySelector("#purchaseSuccessModal .btn-primary")
  if (continueShoppingBtn) {
    continueShoppingBtn.addEventListener("click", () => {
      resetUIState()
    })
  }
})

// Export functions for use in other scripts
window.addToCart = addToCart
window.removeFromCart = removeFromCart
window.clearCart = clearCart
window.checkout = checkout
window.getCartItems = getCartItems
window.updateCartDisplay = updateCartDisplay
window.showToast = showToast
window.updateCartBadge = updateCartBadge
window.resetUIState = resetUIState // Export the resetUIState function for use in other scripts
