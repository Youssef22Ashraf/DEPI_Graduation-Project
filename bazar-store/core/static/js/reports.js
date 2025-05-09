/**
 * Reports Module
 * Handles the integration with the reports microservice for generating PDF and Excel reports
 */

// Base URL for the reports service
const REPORTS_SERVICE_URL = process.env.REPORTS_SERVICE_URL || 'http://localhost:5002';

/**
 * Initialize the reports functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Add report buttons to the purchase history modal
    addReportButtonsToHistoryModal();
    
    // Add event listener for showing purchase history
    window.showPurchaseHistory = showPurchaseHistory;
    
    // Export functions for use in other scripts
    window.reportsModule = {
        showPurchaseHistory,
        generateReport,
        generateInventoryReport,
        addReportButtonsToHistoryModal
    };
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
    
    // Add rows for each order
    data.forEach(order => {
        html += `
            <tr>
                <td>${order.order_id}</td>
                <td>${new Date(order.order_date).toLocaleDateString()}</td>
                <td>${order.items.length} item(s)</td>
                <td>$${parseFloat(order.total_amount).toFixed(2)}</td>
                <td><span class="badge bg-success">Completed</span></td>
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
    document.body.appendChild(iframe);
    
    // Set up a timeout to remove the loading overlay
    setTimeout(() => {
        if (modalBody) {
            const overlay = modalBody.querySelector('.position-absolute');
            if (overlay) overlay.remove();
        }
    }, 3000);
    
    // Navigate the iframe to the report URL to trigger download
    iframe.src = reportUrl;
    
    // Remove the iframe after a delay
    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 5000);
}

/**
 * Generate and download an inventory report (admin only)
 * @param {string} format - The report format ('pdf' or 'excel'), defaults to 'pdf'
 */
function generateInventoryReport(format = 'pdf') {
    // Check if user is admin
    if (!isAdminUser()) {
        console.error('Only admin users can generate inventory reports');
        return;
    }
    
    // Construct the report URL
    const reportUrl = `${REPORTS_SERVICE_URL}/api/reports/inventory?format=${format}`;
    
    // Open the report URL in a new tab/window
    window.open(reportUrl, '_blank');
}

/**
 * Get the current user ID from the session
 * @returns {string|null} - The user ID or null if not available
 */
function getCurrentUserId() {
    // This is a placeholder - implement according to your authentication system
    // For example, you might get this from a cookie, localStorage, or a global variable
    return null; // Replace with actual implementation
}

/**
 * Check if the current user is an admin
 * @returns {boolean} - True if the user is an admin, false otherwise
 */
function isAdminUser() {
    // This is a placeholder - implement according to your authentication system
    // For demo purposes, we'll return true to enable the inventory report button
    return true;
}

/**
 * Navigate to the reports interface
 */
function openReportsInterface() {
    window.open(`${REPORTS_SERVICE_URL}`, '_blank');
}

// Export functions for use in other modules
window.reports = {
    generateReport,
    generateInventoryReport,
    showPurchaseHistory,
    openReportsInterface
};