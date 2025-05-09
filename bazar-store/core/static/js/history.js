/**
 * Purchase History Module
 * Handles the display of purchase history and integration with reports microservice
 */

// Base URL for the reports service
const REPORTS_SERVICE_URL = 'http://localhost:5002';

/**
 * Initialize the purchase history functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for showing purchase history
    const historyLinks = document.querySelectorAll('[data-action="show-history"]');
    historyLinks.forEach(link => {
        link.addEventListener('click', showPurchaseHistory);
    });
    
    // Add report buttons to the purchase history modal
    addReportButtonsToHistoryModal();
});

/**
 * Show purchase history modal with data
 */
function showPurchaseHistory() {
    // Get the history modal element
    const historyModal = new bootstrap.Modal(document.getElementById('historyModal'));
    if (!historyModal) return;
    
    // Show loading indicator
    const historyContainer = document.getElementById('historyContainer');
    if (historyContainer) {
        historyContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-3">Loading purchase history...</p></div>';
    }
    
    // Show the modal
    historyModal.show();
    
    // Fetch purchase history data
    fetchPurchaseHistory()
        .then(data => displayPurchaseHistory(data))
        .catch(error => {
            console.error('Error fetching purchase history:', error);
            if (historyContainer) {
                historyContainer.innerHTML = '<div class="alert alert-danger">Error loading purchase history. Please try again later.</div>';
            }
        });
}

/**
 * Fetch purchase history data from the API
 * @returns {Promise} - Promise resolving to purchase history data
 */
async function fetchPurchaseHistory() {
    // Get the current user ID if available
    const userId = getCurrentUserId();
    
    // Construct the API URL
    let apiUrl = '/api/purchase-history';
    if (userId) {
        apiUrl += `?user_id=${userId}`;
    }
    
    // Fetch the data
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch purchase history: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

/**
 * Get the current user ID from the session
 * @returns {string|null} - The current user ID or null if not logged in
 */
function getCurrentUserId() {
    // Try to get user ID from session storage or other source
    // This implementation depends on how user authentication is handled in the application
    return sessionStorage.getItem('userId') || localStorage.getItem('userId') || null;
}

/**
 * Check if the current user is an admin
 * @returns {boolean} - True if the user is an admin, false otherwise
 */
function isAdminUser() {
    // This implementation depends on how user roles are handled in the application
    return sessionStorage.getItem('userRole') === 'admin' || localStorage.getItem('userRole') === 'admin';
}

/**
 * Display purchase history data in the modal
 * @param {Array} data - Purchase history data
 */
function displayPurchaseHistory(data) {
    const historyContainer = document.getElementById('historyContainer');
    if (!historyContainer) return;
    
    if (!data || data.length === 0) {
        historyContainer.innerHTML = '<div class="alert alert-info">No purchase history found.</div>';
        return;
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
    `;
    
    // Group orders by order_id
    const orders = {};
    data.forEach(item => {
        if (!orders[item.order_id]) {
            orders[item.order_id] = {
                order_id: item.order_id,
                order_date: item.order_date,
                total_amount: item.total_amount,
                items: []
            };
        }
        orders[item.order_id].items.push({
            book_id: item.book_id,
            book_name: item.book_name,
            quantity: item.quantity,
            price: item.price
        });
    });
    
    // Add rows for each order
    Object.values(orders).forEach(order => {
        html += `
            <tr data-bs-toggle="collapse" data-bs-target="#order-${order.order_id}" class="clickable">
                <td>${order.order_id}</td>
                <td>${new Date(order.order_date).toLocaleDateString()}</td>
                <td>${order.items.length} item(s)</td>
                <td>$${parseFloat(order.total_amount).toFixed(2)}</td>
                <td><span class="badge bg-success">Completed</span></td>
            </tr>
            <tr>
                <td colspan="5" class="p-0">
                    <div id="order-${order.order_id}" class="collapse">
                        <div class="card card-body m-2">
                            <h6>Order Details</h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Book</th>
                                            <th>Quantity</th>
                                            <th>Price</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
        `;
        
        order.items.forEach(item => {
            html += `
                <tr>
                    <td>${item.book_name}</td>
                    <td>${item.quantity}</td>
                    <td>$${parseFloat(item.price).toFixed(2)}</td>
                    <td>$${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
                </tr>
            `;
        });
        
        html += `
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <th colspan="3" class="text-end">Total:</th>
                                            <th>$${parseFloat(order.total_amount).toFixed(2)}</th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    historyContainer.innerHTML = html;
    
    // Add report buttons to the modal
    addReportButtonsToHistoryModal();
}

/**
 * Add report generation buttons to the purchase history modal
 */
function addReportButtonsToHistoryModal() {
    const historyModal = document.getElementById('historyModal');
    if (!historyModal) return;
    
    // Find the modal footer or create one if it doesn't exist
    let modalFooter = historyModal.querySelector('.modal-footer');
    if (!modalFooter) {
        modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        historyModal.querySelector('.modal-content').appendChild(modalFooter);
    }
    
    // Clear existing report buttons
    const existingButtons = modalFooter.querySelectorAll('.report-btn');
    existingButtons.forEach(btn => btn.remove());
    
    // Add PDF report button
    const pdfButton = document.createElement('button');
    pdfButton.className = 'btn btn-primary report-btn';
    pdfButton.innerHTML = '<i class="bi bi-file-earmark-pdf me-2"></i>Download PDF Report';
    pdfButton.addEventListener('click', () => generateReport('pdf'));
    modalFooter.appendChild(pdfButton);
    
    // Add Excel report button
    const excelButton = document.createElement('button');
    excelButton.className = 'btn btn-success report-btn ms-2';
    excelButton.innerHTML = '<i class="bi bi-file-earmark-excel me-2"></i>Download Excel Report';
    excelButton.addEventListener('click', () => generateReport('excel'));
    modalFooter.appendChild(excelButton);
    
    // Add inventory report button for admin users
    if (isAdminUser()) {
        const inventoryButton = document.createElement('button');
        inventoryButton.className = 'btn btn-info report-btn ms-2';
        inventoryButton.innerHTML = '<i class="bi bi-box-seam me-2"></i>Inventory Report';
        inventoryButton.addEventListener('click', () => generateInventoryReport());
        modalFooter.appendChild(inventoryButton);
    }
    
    // Add event listeners to the buttons
    document.querySelectorAll('.report-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Show loading indicator
            const loadingToast = showToast('Generating report...', 'info', 5000);
            
            // Add a small delay to allow the toast to be shown
            setTimeout(() => {
                // The actual report generation is handled by the button's click handler
            }, 500);
        });
    });
}

/**
 * Generate and download a purchase history report
 * @param {string} format - The report format ('pdf' or 'excel')
 */
function generateReport(format) {
    // Show loading indicator
    const modalBody = document.querySelector('#historyModal .modal-body');
    if (modalBody) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75';
        loadingOverlay.style.zIndex = '1050';
        loadingOverlay.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2">Generating ${format.toUpperCase()} report...</p>
            </div>
        `;
        modalBody.style.position = 'relative';
        modalBody.appendChild(loadingOverlay);
    }
    
    // Get the current user ID from the session if available
    const userId = getCurrentUserId();
    
    // Construct the report URL
    let reportUrl = `${REPORTS_SERVICE_URL}/api/reports/purchase-history?format=${format}`;
    if (userId) {
        reportUrl += `&user_id=${userId}`;
    }
    
    // Create a hidden iframe to handle the download
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = reportUrl;
    document.body.appendChild(iframe);
    
    // Set up error handling
    iframe.onerror = function() {
        showToast('Error generating report. Please try again later.', 'danger');
        const loadingOverlay = modalBody.querySelector('.position-absolute');
        if (loadingOverlay) {
            modalBody.removeChild(loadingOverlay);
        }
    };
    
    // Set up load handling
    iframe.onload = function() {
        // Show success message
        showToast(`${format.toUpperCase()} report generated successfully!`, 'success');
        
        // Remove the loading overlay
        const loadingOverlay = modalBody.querySelector('.position-absolute');
        if (loadingOverlay) {
            modalBody.removeChild(loadingOverlay);
        }
    };
    
    // Remove the iframe after a delay
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000);
}

/**
 * Generate and download an inventory report
 * @param {string} format - The report format ('pdf' or 'excel')
 */
function generateInventoryReport(format = 'pdf') {
    // Show loading indicator with toast
    const loadingToast = showToast(`Generating inventory ${format.toUpperCase()} report...`, 'info', 5000);
    
    // Construct the report URL
    const reportUrl = `${REPORTS_SERVICE_URL}/api/reports/inventory?format=${format}`;
    
    // Create a hidden iframe to handle the download
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = reportUrl;
    document.body.appendChild(iframe);
    
    // Set up error handling
    iframe.onerror = function() {
        showToast('Error generating inventory report. Please try again later.', 'danger');
    };
    
    // Set up load handling
    iframe.onload = function() {
        // Show success message
        showToast(`Inventory ${format.toUpperCase()} report generated successfully!`, 'success');
    };
    
    // Remove the iframe after a delay
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000);
}

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
window.historyModule = {
    showPurchaseHistory,
    generateReport,
    generateInventoryReport,
    showToast
};