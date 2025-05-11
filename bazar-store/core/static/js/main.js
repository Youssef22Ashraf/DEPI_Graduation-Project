/**
 * Main JavaScript file for Bazar.com
 * Contains core functionality for the bookstore website
 */

// Global variables
let currentBookId = null
let currentBookDetails = null

// Modal instances
let bookModal = null
let purchaseModal = null
let stockModal = null
let historyModal = null
let purchaseSuccessModal = null
let purchaseErrorModal = null
let stockSuccessModal = null

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Hide loading overlay after initialization
  setTimeout(() => {
    document.getElementById("loadingOverlay").style.display = "none"
  }, 1000)

  // Initialize Bootstrap modals
  const bootstrap = window.bootstrap // Declare bootstrap variable
  bookModal = new bootstrap.Modal(document.getElementById("bookModal"))
  purchaseModal = new bootstrap.Modal(document.getElementById("purchaseConfirmModal"))
  stockModal = new bootstrap.Modal(document.getElementById("stockModal"))
  historyModal = new bootstrap.Modal(document.getElementById("historyModal"))
  purchaseSuccessModal = new bootstrap.Modal(document.getElementById("purchaseSuccessModal"))
  purchaseErrorModal = new bootstrap.Modal(document.getElementById("purchaseErrorModal"))
  stockSuccessModal = new bootstrap.Modal(document.getElementById("stockSuccessModal"))

  // Initialize event listeners
  initializeEventListeners()

  // Load the home page content
  loadHomePage()

  // Initialize cart badge
  updateCartBadge()

  // Add event listener for cart modal to update cart display when opened
  const cartModalElement = document.getElementById("cartModal")
  if (cartModalElement) {
    cartModalElement.addEventListener("show.bs.modal", () => {
      updateCartDisplay()
    })
  }

  // Setup connection status monitoring
  setupConnectionMonitoring()
})

/**
 * Initialize event listeners for the page
 */
function initializeEventListeners() {
  // Search input event listener for Enter key
  const searchInput = document.getElementById("searchInput")
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        searchByInput()
      }
    })
  }

  // Purchase button event listener
  const purchaseBtn = document.getElementById("purchaseBtn")
  if (purchaseBtn) {
    purchaseBtn.addEventListener("click", () => {
      if (currentBookId && currentBookDetails) {
        bookModal.hide()
        showPurchaseConfirm(currentBookId, currentBookDetails)
      }
    })
  }

  // Add stock button event listener
  const addStockBtn = document.getElementById("addStockBtn")
  if (addStockBtn) {
    addStockBtn.addEventListener("click", () => {
      if (currentBookId && currentBookDetails) {
        bookModal.hide()
        showStockManagement(currentBookId, currentBookDetails)
      }
    })
  }

  // Confirm add stock button event listener
  const confirmAddStockBtn = document.getElementById("confirmAddStockBtn")
  if (confirmAddStockBtn) {
    confirmAddStockBtn.addEventListener("click", () => {
      addStock()
    })
  }

  // Confirm purchase button event listener
  const confirmPurchaseBtn = document.getElementById("confirmPurchaseBtn")
  if (confirmPurchaseBtn) {
    confirmPurchaseBtn.addEventListener("click", () => {
      const shippingAddress = document.getElementById("confirm-shipping-address").value.trim()
      const paymentMethod = document.getElementById("confirm-payment-method").value

      if (!shippingAddress) {
        // Add validation feedback
        document.getElementById("confirm-shipping-address").classList.add("is-invalid")
        return
      } else {
        document.getElementById("confirm-shipping-address").classList.remove("is-invalid")
      }

      if (!paymentMethod) {
        // Add validation feedback
        document.getElementById("confirm-payment-method").classList.add("is-invalid")
        return
      } else {
        document.getElementById("confirm-payment-method").classList.remove("is-invalid")
      }

      if (currentBookId) purchaseBook(currentBookId, shippingAddress, paymentMethod)
    })
  }
}

/**
 * Setup connection status monitoring
 */
function setupConnectionMonitoring() {
  const connectionStatus = document.getElementById("connectionStatus")

  // Check connection status
  function updateConnectionStatus() {
    if (navigator.onLine) {
      connectionStatus.textContent = "Online"
      connectionStatus.className = "connection-status online"
      setTimeout(() => {
        connectionStatus.style.display = "none"
      }, 3000)
    } else {
      connectionStatus.textContent = "Offline - Check your connection"
      connectionStatus.className = "connection-status offline"
      connectionStatus.style.display = "block"
    }
  }

  // Add event listeners for online/offline events
  window.addEventListener("online", updateConnectionStatus)
  window.addEventListener("offline", updateConnectionStatus)

  // Initial check
  updateConnectionStatus()
}

/**
 * Fetch with retry functionality
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise} - Promise resolving to the fetch response
 */
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  try {
    const response = await fetch(url, options)
    if (response.ok) {
      return response
    }

    // If we get a 5xx error and have retries left, retry the request
    if (response.status >= 500 && retries > 0) {
      console.log(`Retrying fetch to ${url}, ${retries} retries left`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return fetchWithRetry(url, options, retries - 1, delay * 1.5)
    }

    return response
  } catch (error) {
    if (retries > 0) {
      console.log(`Fetch error, retrying: ${error.message}, ${retries} retries left`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return fetchWithRetry(url, options, retries - 1, delay * 1.5)
    }
    throw error
  }
}

/**
 * Search for books by topic
 * @param {string} topic - The topic to search for
 */
function searchBooks(topic) {
  // Show loading overlay
  document.getElementById("loadingOverlay").style.display = "flex"

  // Hide the featured books section when searching
  const featuredSection = document.querySelector(".featured-books")
  if (featuredSection) {
    featuredSection.style.display = "none"
  }

  const resultsElement = document.getElementById("results")
  if (!resultsElement) return

  resultsElement.innerHTML =
    '<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>'

  let searchTerm = topic

  // Handle special category pages
  if (topic === "best sellers") {
    // Show the most popular book - Designing Data-Intensive Applications
    fetchWithRetry("/api/info/5") // ID of Designing Data-Intensive Applications
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        const results = document.getElementById("results")
        results.innerHTML = '<h3 class="col-12 mb-4">Best Sellers</h3>'

        if (data.book) {
          const book = data.book
          const stockClass = book.quantity < 5 ? "low" : ""
          const stockText = book.quantity < 5 ? `Only ${book.quantity} left!` : `${book.quantity} in stock`

          results.innerHTML += `
                        <div class="col-md-6 mx-auto mb-4">
                            <div class="card book-card">
                                <div class="card-body">
                                    <h5 class="card-title">${book.title}</h5>
                                    <h6 class="card-subtitle mb-2 text-muted">${book.author}</h6>
                                    <p class="card-text">${book.description}</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="book-price">$${Number.parseFloat(book.price).toFixed(2)}</span>
                                        <span class="book-stock ${stockClass}">${stockText}</span>
                                    </div>
                                    <button class="btn btn-outline-primary mt-3 w-100" onclick="showBookDetails(${book.id})">View Details</button>
                                </div>
                            </div>
                        </div>
                    `
        } else {
          results.innerHTML += '<div class="col-12 text-center"><p>Best seller information not available.</p></div>'
        }

        // Hide loading overlay
        document.getElementById("loadingOverlay").style.display = "none"
      })
      .catch((error) => {
        console.error("Error fetching best seller:", error)
        document.getElementById("results").innerHTML =
          '<div class="col-12 text-center"><p>Error loading best seller information: ' + error.message + "</p></div>"

        // Hide loading overlay
        document.getElementById("loadingOverlay").style.display = "none"
      })
    return
  } else if (topic === "new releases") {
    // Show the newest books
    searchTerm = "distributed systems"
  } else if (topic === "special offers") {
    searchTerm = "undergraduate school"
  }

  // Create a heading for the search results
  const searchHeading = document.createElement("h3")
  searchHeading.className = "col-12 mb-4"
  searchHeading.textContent = `Search Results for "${topic}"`

  // Use fetch with proper error handling
  fetchWithRetry(`/api/search/${encodeURIComponent(searchTerm)}`)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`)
      }
      return res.json()
    })
    .then((data) => {
      const results = document.getElementById("results")
      results.innerHTML = ""

      // Add the heading to results
      results.appendChild(searchHeading)

      if (data.books && data.books.length > 0) {
        data.books.forEach((book) => {
          const stockClass = book.quantity < 5 ? "low" : ""
          const stockText = book.quantity < 5 ? `Only ${book.quantity} left!` : `${book.quantity} in stock`

          results.innerHTML += `
                        <div class="col-md-4 mb-4">
                            <div class="card book-card">
                                <div class="card-body">
                                    <h5 class="card-title">${book.title}</h5>
                                    <h6 class="card-subtitle mb-2 text-muted">${book.author}</h6>
                                    <p class="card-text">${book.description.substring(0, 100)}...</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="book-price">$${Number.parseFloat(book.price).toFixed(2)}</span>
                                        <span class="book-stock ${stockClass}">${stockText}</span>
                                    </div>
                                    <button class="btn btn-outline-primary mt-3 w-100" onclick="showBookDetails(${book.id})">View Details</button>
                                </div>
                            </div>
                        </div>
                    `
        })
      } else {
        results.innerHTML += '<div class="col-12 text-center"><p>No books found for "' + topic + '"</p></div>'
      }

      // Hide loading overlay
      document.getElementById("loadingOverlay").style.display = "none"
    })
    .catch((error) => {
      console.error("Search error:", error)
      document.getElementById("results").innerHTML =
        '<div class="col-12 text-center"><p>Error searching for books: ' + error.message + "</p></div>"

      // Hide loading overlay
      document.getElementById("loadingOverlay").style.display = "none"
    })
}

/**
 * Search for books based on the input field value
 */
function searchByInput() {
  const topic = document.getElementById("searchInput").value.trim()
  if (topic) searchBooks(topic)
}

/**
 * Load the home page content
 */
function loadHomePage() {
  // Show loading overlay
  document.getElementById("loadingOverlay").style.display = "flex"

  // Clear the results area to prepare for featured content
  const resultsElement = document.getElementById("results")
  if (!resultsElement) return

  resultsElement.innerHTML = ""

  // The featured books section is already in the HTML, so we just need to
  // make sure it's visible and load some recommended books
  const featuredSection = document.querySelector(".featured-books")
  if (featuredSection) {
    featuredSection.style.display = "block"
  }

  // Load some recommended books in the results area
  fetchWithRetry("/api/search/recommended")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`)
      }
      return res.json()
    })
    .then((data) => {
      if (data.books && data.books.length > 0) {
        const resultsDiv = document.getElementById("results")
        resultsDiv.innerHTML = '<h3 class="col-12 mb-4">Recommended For You</h3>'

        data.books.forEach((book) => {
          const stockClass = book.quantity < 5 ? "low" : ""
          const stockText = book.quantity < 5 ? `Only ${book.quantity} left!` : `${book.quantity} in stock`

          resultsDiv.innerHTML += `
                        <div class="col-md-4 mb-4">
                            <div class="card book-card">
                                <div class="card-body">
                                    <h5 class="card-title">${book.title}</h5>
                                    <h6 class="card-subtitle mb-2 text-muted">${book.author}</h6>
                                    <p class="card-text">${book.description.substring(0, 100)}...</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="book-price">$${Number.parseFloat(book.price).toFixed(2)}</span>
                                        <span class="book-stock ${stockClass}">${stockText}</span>
                                    </div>
                                    <button class="btn btn-outline-primary mt-3 w-100" onclick="showBookDetails(${book.id})">View Details</button>
                                </div>
                            </div>
                        </div>
                    `
        })
      } else {
        // If no recommended books are available, show some default recommendations
        displayDefaultRecommendations()
      }

      // Hide loading overlay
      document.getElementById("loadingOverlay").style.display = "none"
    })
    .catch((error) => {
      console.error("Error loading recommended books:", error)
      // If there's an error, show default recommendations instead of an error message
      displayDefaultRecommendations()

      // Hide loading overlay
      document.getElementById("loadingOverlay").style.display = "none"
    })
}

/**
 * Display default book recommendations when API fails or returns no books
 */
function displayDefaultRecommendations() {
  const resultsDiv = document.getElementById("results")
  if (!resultsDiv) return

  resultsDiv.innerHTML = '<h3 class="col-12 mb-4">Recommended For You</h3>'

  // Default book recommendations
  const defaultBooks = [
    {
      id: 1,
      title: "Distributed Systems: Principles and Paradigms",
      author: "Andrew S. Tanenbaum",
      description:
        "This book covers the principles, advanced concepts, and technologies of distributed systems in detail, including communication, replication, fault tolerance, and security.",
      price: 79.99,
      quantity: 10,
      topic: "distributed systems",
    },
    {
      id: 2,
      title: "Database System Concepts",
      author: "Abraham Silberschatz",
      description:
        "Database System Concepts provides a comprehensive introduction to database systems, covering database design, query languages, transaction processing, and more.",
      price: 89.99,
      quantity: 15,
      topic: "undergraduate school",
    },
    {
      id: 3,
      title: "Computer Networks",
      author: "Andrew S. Tanenbaum",
      description:
        "This classic textbook provides a comprehensive look at the architecture, principles, and technologies of computer networks, from the physical layer to the application layer.",
      price: 69.99,
      quantity: 8,
      topic: "undergraduate school",
    },
  ]

  defaultBooks.forEach((book) => {
    const stockClass = book.quantity < 5 ? "low" : ""
    const stockText = book.quantity < 5 ? `Only ${book.quantity} left!` : `${book.quantity} in stock`

    resultsDiv.innerHTML += `
      <div class="col-md-4 mb-4">
        <div class="card book-card">
          <div class="card-body">
            <h5 class="card-title">${book.title}</h5>
            <h6 class="card-subtitle mb-2 text-muted">${book.author}</h6>
            <p class="card-text">${book.description.substring(0, 100)}...</p>
            <div class="d-flex justify-content-between align-items-center">
              <span class="book-price">$${Number.parseFloat(book.price).toFixed(2)}</span>
              <span class="book-stock ${stockClass}">${stockText}</span>
            </div>
            <button class="btn btn-outline-primary mt-3 w-100" onclick="showBookDetails(${book.id})">View Details</button>
          </div>
        </div>
      </div>
    `
  })
}

/**
 * Show book details in a modal
 * @param {number} bookId - The ID of the book to show details for
 */
function showBookDetails(bookId) {
  if (!bookId) return

  // Show loading overlay
  document.getElementById("loadingOverlay").style.display = "flex"

  currentBookId = bookId

  fetchWithRetry(`/api/info/${bookId}`)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`)
      }
      return res.json()
    })
    .then((data) => {
      if (data.book) {
        currentBookDetails = data.book
        const book = data.book
        const stockClass = book.quantity < 5 ? "text-danger" : "text-success"
        const stockText = book.quantity < 5 ? `Only ${book.quantity} left!` : `${book.quantity} in stock`

        document.getElementById("modalTitle").textContent = book.title
        document.getElementById("modalBody").innerHTML = `
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="text-muted">${book.author}</h6>
                            <p>${book.description}</p>
                            <p><strong>Topic:</strong> ${book.topic}</p>
                            <p><strong>Price:</strong> <span class="text-primary">$${Number.parseFloat(book.price).toFixed(2)}</span></p>
                            <p><strong>Stock:</strong> <span class="${stockClass}">${stockText}</span></p>
                        </div>
                        <div class="col-md-4">
                            <div class="d-grid gap-2">
                                <button class="btn btn-success" id="addToCartBtn">Add to Cart</button>
                            </div>
                        </div>
                    </div>
                `

        // Add event listener for the Add to Cart button
        setTimeout(() => {
          const addToCartBtn = document.getElementById("addToCartBtn")
          if (addToCartBtn) {
            addToCartBtn.addEventListener("click", () => {
              addToCart(book)
            })
          }
        }, 100)

        // Show or hide the Add Stock button based on whether we're in admin mode
        const addStockBtn = document.getElementById("addStockBtn")
        if (addStockBtn) {
          // For demo purposes, always show the button
          addStockBtn.style.display = "block"
        }

        bookModal.show()
      } else {
        showToast("Book information not available", "danger")
      }

      // Hide loading overlay
      document.getElementById("loadingOverlay").style.display = "none"
    })
    .catch((error) => {
      console.error("Error fetching book details:", error)
      showToast("Error loading book details: " + error.message, "danger")

      // Hide loading overlay
      document.getElementById("loadingOverlay").style.display = "none"
    })
}

/**
 * Show purchase confirmation modal
 * @param {number} bookId - The ID of the book to purchase
 * @param {Object} bookDetails - The book details
 */
function showPurchaseConfirm(bookId, bookDetails) {
  // Display book details in the purchase confirmation modal
  document.getElementById("purchaseConfirmDetails").innerHTML = `
        <h5>${bookDetails.title}</h5>
        <p><strong>Author:</strong> ${bookDetails.author}</p>
        <p><strong>Price:</strong> $${Number.parseFloat(bookDetails.price).toFixed(2)}</p>
    `

  // Reset form fields
  document.getElementById("confirm-shipping-address").value = ""
  document.getElementById("confirm-payment-method").value = ""

  // Show the purchase confirmation modal
  purchaseModal.show()
}

/**
 * Purchase a book
 * @param {number} bookId - The ID of the book to purchase
 * @param {string} shippingAddress - The shipping address
 * @param {string} paymentMethod - The payment method
 */
function purchaseBook(bookId, shippingAddress, paymentMethod) {
  if (!bookId || !shippingAddress || !paymentMethod) return

  // Show loading overlay
  document.getElementById("loadingOverlay").style.display = "flex"

  const purchaseData = {
    shipping_address: shippingAddress,
    payment_method: paymentMethod,
  }

  fetchWithRetry(`/api/purchase/${bookId}`, {
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
    .then((data) => {
      if (data.success) {
        purchaseModal.hide()

        // Check if discount was applied
        if (data.discount_applied) {
          const discountInfoElement = document.getElementById("purchaseDiscountInfo")
          const discountMessageElement = document.getElementById("discountMessage")
          if (discountInfoElement && discountMessageElement) {
            discountInfoElement.style.display = "block"
            discountMessageElement.textContent =
              data.discount_message || `You saved $${data.discount_amount.toFixed(2)} with our category discount!`
          }
        }

        purchaseSuccessModal.show()

        // Update the book quantity in the UI
        if (currentBookDetails) {
          currentBookDetails.quantity -= 1
        }
      } else {
        throw new Error(data.message || "Purchase could not be completed")
      }

      // Hide loading overlay
      document.getElementById("loadingOverlay").style.display = "none"
    })
    .catch((error) => {
      console.error("Purchase error:", error)
      purchaseModal.hide()

      document.getElementById("errorMessage").textContent = error.message || "Error processing purchase"
      purchaseErrorModal.show()

      // Hide loading overlay
      document.getElementById("loadingOverlay").style.display = "none"
    })
}

/**
 * Show stock management modal
 * @param {number} bookId - The ID of the book
 * @param {Object} bookDetails - The book details
 */
function showStockManagement(bookId, bookDetails) {
  document.getElementById("stockBookDetails").innerHTML = `
        <h6>${bookDetails.title}</h6>
        <p class="text-muted small">Current stock: ${bookDetails.quantity}</p>
    `

  document.getElementById("stockQuantity").value = 1
  stockModal.show()
}

/**
 * Add stock to a book
 */
function addStock() {
  const quantityToAdd = Number.parseInt(document.getElementById("stockQuantity").value)

  if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
    showToast("Please enter a valid quantity", "danger")
    return
  }

  // Show loading overlay
  document.getElementById("loadingOverlay").style.display = "flex"

  // Create stock data object
  const stockData = {
    item_id: currentBookId,
    quantity: quantityToAdd,
  }

  fetchWithRetry("/api/catalog/add-stock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(stockData),
  })
    .then((res) => {
      if (!res.ok) {
        return res.json().then((errData) => {
          throw new Error(errData.message || `Error: ${res.status} ${res.statusText}`)
        })
      }
      return res.json()
    })
    .then((data) => {
      if (data.success) {
        stockModal.hide()

        // Update the book quantity in the UI
        if (currentBookDetails) {
          currentBookDetails.quantity = data.book.quantity
        }

        // Show success modal
        document.getElementById("stockSuccessQuantity").textContent = quantityToAdd
        document.getElementById("stockSuccessTitle").textContent = currentBookDetails.title
        stockSuccessModal.show()
      } else {
        throw new Error(data.message || "Stock update could not be completed")
      }

      // Hide loading overlay
      document.getElementById("loadingOverlay").style.display = "none"
    })
    .catch((error) => {
      console.error("Stock update error:", error)
      showToast("Error updating stock: " + error.message, "danger")

      // Hide loading overlay
      document.getElementById("loadingOverlay").style.display = "none"
    })
}

/**
 * Show purchase history
 */
function showPurchaseHistory() {
  fetchWithRetry("/api/orders")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`)
      }
      return res.json()
    })
    .then((data) => {
      const historyBody = document.getElementById("historyBody")
      historyBody.innerHTML = ""

      if (data.orders && data.orders.length > 0) {
        let orderProcessed = 0
        const totalOrders = data.orders.length

        data.orders.forEach((order) => {
          // Fetch order details to get the book information
          fetchWithRetry(`/api/orders/${order.order_id}`)
            .then((res) => {
              if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`)
              }
              return res.json()
            })
            .then((orderData) => {
              orderProcessed++
              if (orderData.items && orderData.items.length > 0) {
                orderData.items.forEach((item) => {
                  historyBody.innerHTML += `
                                        <tr>
                                            <td>${order.order_id}</td>
                                            <td>${item.title}</td>
                                            <td>${new Date(order.order_date).toLocaleDateString()}</td>
                                            <td>$${Number.parseFloat(item.price).toFixed(2)}</td>
                                        </tr>
                                    `
                })
              }

              // If all orders processed and no items were found
              if (orderProcessed === totalOrders && historyBody.innerHTML === "") {
                historyBody.innerHTML =
                  '<tr><td colspan="4" class="text-center">No purchase history items found</td></tr>'
              }
            })
            .catch((error) => {
              console.error(`Error fetching order details for order ${order.order_id}:`, error)
              orderProcessed++

              // If all orders processed and no items were found
              if (orderProcessed === totalOrders && historyBody.innerHTML === "") {
                historyBody.innerHTML =
                  '<tr><td colspan="4" class="text-center">Error loading some order details</td></tr>'
              }
            })
        })
      } else {
        historyBody.innerHTML = '<tr><td colspan="4" class="text-center">No purchase history found</td></tr>'
      }

      historyModal.show()
    })
    .catch((error) => {
      console.error("Error fetching purchase history:", error)
      document.getElementById("historyBody").innerHTML =
        '<tr><td colspan="4" class="text-center">Error loading purchase history: ' + error.message + "</td></tr>"
      historyModal.show()
    })
}

/**
 * Update the cart badge with the current number of items
 */
function updateCartBadge() {
  const cartBadge = document.getElementById("cartBadge")
  if (cartBadge) {
    const count = getCartItems().length
    cartBadge.textContent = count
    cartBadge.style.display = count > 0 ? "inline-block" : "none"
  }
}

/**
 * Update the cart display
 */
function updateCartDisplay() {
  // This function will be implemented in special_offers.js
  console.log("Updating cart display...")
}

/**
 * Add item to cart
 * @param {Object} book - The book to add to cart
 */
function addToCart(book) {
  // This function will be implemented in special_offers.js
  console.log("Adding to cart:", book)

  // Call the actual implementation from special_offers.js
  if (window.addToCart) {
    window.addToCart(book)
  }
}

/**
 * Show a toast message
 * @param {string} message - The message to show
 * @param {string} type - The type of toast message (success, danger, etc.)
 */
function showToast(message, type) {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector(".toast-container")
  if (!toastContainer) {
    toastContainer = document.createElement("div")
    toastContainer.className = "position-fixed bottom-0 end-0 p-3 toast-container"
    toastContainer.style.zIndex = "11"
    document.body.appendChild(toastContainer)
  }

  // Create toast element
  const toastElement = document.createElement("div")
  toastElement.className = `toast align-items-center text-white bg-${type} border-0`
  toastElement.setAttribute("role", "alert")
  toastElement.setAttribute("aria-live", "assertive")
  toastElement.setAttribute("aria-atomic", "true")

  toastElement.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi bi-info-circle me-2"></i> ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `

  toastContainer.appendChild(toastElement)

  // Initialize and show the toast
  const bootstrap = window.bootstrap // Declare bootstrap variable
  const toast = new bootstrap.Toast(toastElement, {
    autohide: true,
    delay: 3000,
  })
  toast.show()

  // Remove toast after it's hidden
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove()
  })
}

/**
 * Get cart items
 */
function getCartItems() {
  // This function will be implemented in special_offers.js
  // Return an empty array as fallback
  return window.getCartItems ? window.getCartItems() : []
}

// Export functions for use in other scripts
window.searchBooks = searchBooks
window.searchByInput = searchByInput
window.showBookDetails = showBookDetails
window.updateCartBadge = updateCartBadge
window.showPurchaseHistory = showPurchaseHistory
window.showToast = showToast
