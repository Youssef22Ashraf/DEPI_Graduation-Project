/**
 * Purchase History Module
 * Handles the display of purchase history
 */

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Add event listener for showing purchase history
  const historyLinks = document.querySelectorAll('[data-action="show-history"]')
  historyLinks.forEach((link) => {
    link.addEventListener("click", showPurchaseHistory)
  })
})

/**
 * Show purchase history modal with data
 */
function showPurchaseHistory() {
  // If the global function exists, use it
  if (window.showPurchaseHistory && window.showPurchaseHistory !== showPurchaseHistory) {
    window.showPurchaseHistory()
    return
  }

  // Get the history modal element
  const historyModalElement = document.getElementById("historyModal")
  if (!historyModalElement) {
    console.error("History modal not found")
    return
  }
  const historyModal = new bootstrap.Modal(historyModalElement)

  // Show loading indicator
  const historyContainer = document.getElementById("historyContainer")
  if (!historyContainer) {
    console.error("historyContainer element not found")
    return
  }
  historyContainer.innerHTML =
    '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-3">Loading purchase history...</p></div>'

  // Show the modal
  historyModal.show()

  // Fetch purchase history data
  fetchPurchaseHistory()
    .then((data) => displayPurchaseHistory(data))
    .catch((error) => {
      console.error("Error fetching purchase history:", error)
      historyContainer.innerHTML =
        '<div class="alert alert-danger">Error loading purchase history. Please try again later.</div>'
    })
}

/**
 * Fetch purchase history data from the API
 * @returns {Promise} - Promise resolving to purchase history data
 */
async function fetchPurchaseHistory() {
  // Construct the API URL
  const apiUrl = "/api/orders"

  // Fetch the data
  const response = await fetch(apiUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch purchase history: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Get the current user ID from the session
 * @returns {string|null} - The current user ID or null if not logged in
 */
function getCurrentUserId() {
  return sessionStorage.getItem("userId") || localStorage.getItem("userId") || null
}

/**
 * Display purchase history data in the modal
 * @param {Object} data - Purchase history data
 */
async function displayPurchaseHistory(data) {
  const historyContainer = document.getElementById("historyContainer")
  if (!historyContainer) {
    console.error("historyContainer element not found")
    return
  }

  if (!data.orders || data.orders.length === 0) {
    historyContainer.innerHTML = '<div class="alert alert-info">No purchase history found.</div>'
    return
  }

  // Create table to display purchase history
  let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `

  // Process orders sequentially using Promise.all
  const orderPromises = data.orders.map(async (order) => {
    let orderHtml = `
            <tr data-bs-toggle="collapse" data-bs-target="#order-${order.order_id.replace(/[^a-zA-Z0-9]/g, "")}" class="clickable">
                <td>${order.order_id}</td>
                <td>${new Date(order.order_date).toLocaleDateString()}</td>
                <td>${order.item_count} item(s)</td>
                <td>$${Number.parseFloat(order.total_amount).toFixed(2)}</td>
                <td><span class="badge bg-success">Completed</span></td>
            </tr>
            <tr>
                <td colspan="5" class="p-0">
                    <div id="order-${order.order_id.replace(/[^a-zA-Z0-9]/g, "")}" class="collapse">
                        <div class="card card-body m-2">
                            <h6>Order Details</h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Book</th>
                                            <th>Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
        `

    try {
      // Fetch order details
      const response = await fetch(`/api/orders/${order.order_id}`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const orderData = await response.json()

      // Add items to the order HTML
      orderData.items.forEach((item) => {
        orderHtml += `
                    <tr>
                        <td>${item.title}</td>
                        <td>$${Number.parseFloat(item.price).toFixed(2)}</td>
                    </tr>
                `
      })
    } catch (error) {
      console.error(`Error fetching details for order ${order.order_id}:`, error)
      orderHtml += `
                <tr>
                    <td colspan="2" class="text-center text-danger">Error loading order details</td>
                </tr>
            `
    }

    orderHtml += `
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <th class="text-end">Total:</th>
                                            <th>$${Number.parseFloat(order.total_amount).toFixed(2)}</th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `

    return orderHtml
  })

  try {
    // Wait for all order details to be processed
    const orderResults = await Promise.all(orderPromises)
    html += orderResults.join("")
    html += `
                </tbody>
            </table>
        </div>
        `

    // Update the container with complete HTML
    historyContainer.innerHTML = html
  } catch (error) {
    console.error("Error processing orders:", error)
    historyContainer.innerHTML =
      '<div class="alert alert-danger">Error processing orders. Please try again later.</div>'
  }
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, danger, warning, info)
 * @param {number} duration - How long to show the toast in milliseconds
 * @returns {HTMLElement} - The toast container element
 */
function showToast(message, type = "success", duration = 3000) {
  // Use the global showToast function if available
  if (window.showToast) {
    return window.showToast(message, type, duration)
  }

  // Fallback implementation
  const toastContainer = document.createElement("div")
  toastContainer.className = "position-fixed bottom-0 end-0 p-3"
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

  const toastElement = toastContainer.querySelector(".toast")
  // Ensure bootstrap is available
  if (typeof bootstrap !== "undefined") {
    const toast = new bootstrap.Toast(toastElement, {
      delay: duration,
    })
    toast.show()

    toastContainer.querySelector(".toast").addEventListener("hidden.bs.toast", () => {
      toastContainer.remove()
    })
  } else {
    console.error("Bootstrap is not loaded. Toast functionality might not work correctly.")
    // Optionally, provide a fallback mechanism if bootstrap is not available.
    toastElement.style.display = "none" // Hide the toast if bootstrap is missing
  }

  return toastContainer
}

// Export functions for use in other scripts
window.historyModule = {
  showPurchaseHistory,
  showToast,
}
