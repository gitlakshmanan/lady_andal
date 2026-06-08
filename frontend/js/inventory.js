// Check authentication
if (!localStorage.getItem("token")) {
  window.location.href = "login.html";
}

// Global variables
let currentStockData = [];
let productsData = [];

// Load on page ready
document.addEventListener("DOMContentLoaded", () => {
  loadCurrentStock();
  loadProducts();
  loadProductSelects();
  setupEventListeners();
});

function setupEventListeners() {
  // Stock search
  document
    .getElementById("stockSearch")
    ?.addEventListener("input", filterStock);
  document
    .getElementById("locationFilter")
    ?.addEventListener("change", filterStock);
  document
    .getElementById("refreshStockBtn")
    ?.addEventListener("click", () => loadCurrentStock());

  // Stock entry
  document
    .getElementById("saveStockEntryBtn")
    ?.addEventListener("click", saveStockEntry);

  // Product
  document
    .getElementById("saveProductBtn")
    ?.addEventListener("click", saveProduct);

  // Stock adjustment
  document
    .getElementById("adjustmentForm")
    ?.addEventListener("submit", applyAdjustment);

  // Ledger view
  document
    .getElementById("viewLedgerBtn")
    ?.addEventListener("click", viewLedger);
}

// Load current stock
async function loadCurrentStock() {
  try {
    const locationId = document.getElementById("locationFilter")?.value;
    const filters = locationId ? { location_id: locationId } : {};

    currentStockData = await api.getCurrentStock(filters);
    displayStockTable(currentStockData);
  } catch (error) {
    console.error("Failed to load stock:", error);
    showToast("Failed to load stock data", "error");
  }
}

function displayStockTable(data) {
  const tbody = document.getElementById("stockBody");

  if (!data || data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center text-muted">No stock data available</td></tr>';
    return;
  }

  tbody.innerHTML = data
    .map(
      (item) => `
        <tr>
            <td><code>${escapeHtml(item.product_code)}</code></td>
            <td><strong>${escapeHtml(item.product_name)}</strong></td>
            <td>${escapeHtml(item.category_name || "Uncategorized")}</td>
            <td>${escapeHtml(item.location_name || "N/A")}</td>
            <td class="${item.balance <= item.min_stock ? "text-danger fw-bold" : ""}">
                ${item.balance} ${item.unit || "units"}
            </td>
            <td>${item.min_stock}</td>
            <td>${getStockStatusBadge(item.balance, item.min_stock)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewStockDetails(${item.product_id})">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success ms-1" onclick="quickStockEntry(${item.product_id})">
                    <i class="bi bi-plus-circle"></i>
                </button>
            </td>
        </tr>
    `,
    )
    .join("");
}

function getStockStatusBadge(balance, minStock) {
  if (balance <= 0) return '<span class="badge bg-danger">Out of Stock</span>';
  if (balance <= minStock)
    return '<span class="badge bg-warning">Low Stock</span>';
  if (balance > minStock * 2)
    return '<span class="badge bg-success">Good</span>';
  return '<span class="badge bg-info">Adequate</span>';
}

function filterStock() {
  const searchTerm = document
    .getElementById("stockSearch")
    ?.value.toLowerCase();
  const locationId = document.getElementById("locationFilter")?.value;

  let filtered = [...currentStockData];

  if (searchTerm) {
    filtered = filtered.filter(
      (item) =>
        item.product_name?.toLowerCase().includes(searchTerm) ||
        item.product_code?.toLowerCase().includes(searchTerm),
    );
  }

  if (locationId) {
    filtered = filtered.filter((item) => item.location_id == locationId);
  }

  displayStockTable(filtered);
}

// Load products
async function loadProducts() {
  try {
    productsData = await api.getProducts();
    displayProductsTable(productsData);
  } catch (error) {
    console.error("Failed to load products:", error);
    showToast("Failed to load products", "error");
  }
}

function displayProductsTable(products) {
  const tbody = document.getElementById("productsBody");

  if (!products || products.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center">No products found</td></tr>';
    return;
  }

  tbody.innerHTML = products
    .map(
      (product) => `
        <tr>
            <td><code>${escapeHtml(product.code)}</code></td>
            <td><strong>${escapeHtml(product.name)}</strong></td>
            <td>${escapeHtml(product.category_name || "Uncategorized")}</td>
            <td>${product.unit}</td>
            <td>${product.min_stock}</td>
            <td>${product.max_stock}</td>
            <td>${product.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editProduct(${product.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteProduct(${product.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `,
    )
    .join("");
}

// Load product selects for dropdowns
async function loadProductSelects() {
  try {
    const products = await api.getProducts();

    const selects = ["entryProductId", "adjProductId", "ledgerProductSelect"];
    selects.forEach((selectId) => {
      const select = document.getElementById(selectId);
      if (select) {
        select.innerHTML =
          '<option value="">Select Product</option>' +
          products
            .map(
              (p) => `<option value="${p.id}">${p.code} - ${p.name}</option>`,
            )
            .join("");
      }
    });

    // Load categories
    const categories = await api.getCategories();
    const categorySelect = document.getElementById("productCategory");
    if (categorySelect && categories) {
      categorySelect.innerHTML =
        '<option value="">Select Category</option>' +
        categories
          .map((c) => `<option value="${c.id}">${c.name}</option>`)
          .join("");
    }
  } catch (error) {
    console.error("Failed to load selects:", error);
  }
}

// Save stock entry
async function saveStockEntry() {
  const productId = document.getElementById("entryProductId").value;
  const locationId = document.getElementById("entryLocationId").value;
  const quantity = parseFloat(document.getElementById("entryQuantity").value);
  const refType = document.getElementById("entryRefType").value;
  const remarks = document.getElementById("entryRemarks").value;

  if (!productId || !quantity || quantity <= 0) {
    showToast("Please fill all required fields", "error");
    return;
  }

  try {
    await api.createStockEntry({
      product_id: parseInt(productId),
      location_id: parseInt(locationId),
      quantity: quantity,
      reference_type: refType,
      remarks: remarks,
    });

    showToast("Stock entry saved successfully!", "success");

    // Close modal and reset form
    bootstrap.Modal.getInstance(
      document.getElementById("stockEntryModal"),
    ).hide();
    document.getElementById("stockEntryForm").reset();

    // Refresh data
    loadCurrentStock();
  } catch (error) {
    console.error("Failed to save stock entry:", error);
    showToast(error.message || "Failed to save stock entry", "error");
  }
}

// Save product
async function saveProduct() {
  const productData = {
    code: document.getElementById("productCode").value,
    name: document.getElementById("productName").value,
    category_id: document.getElementById("productCategory").value || null,
    unit: document.getElementById("productUnit").value,
    min_stock:
      parseFloat(document.getElementById("productMinStock").value) || 0,
    max_stock:
      parseFloat(document.getElementById("productMaxStock").value) || 0,
  };

  if (!productData.code || !productData.name || !productData.unit) {
    showToast("Please fill all required fields", "error");
    return;
  }

  try {
    await api.createProduct(productData);
    showToast("Product created successfully!", "success");

    bootstrap.Modal.getInstance(document.getElementById("productModal")).hide();
    document.getElementById("productForm").reset();

    loadProducts();
    loadProductSelects();
  } catch (error) {
    console.error("Failed to save product:", error);
    showToast(error.message || "Failed to save product", "error");
  }
}

// Apply stock adjustment
async function applyAdjustment(e) {
  e.preventDefault();

  const productId = document.getElementById("adjProductId").value;
  const locationId = document.getElementById("adjLocationId").value;
  const adjType = document.getElementById("adjType").value;
  let quantity = parseFloat(document.getElementById("adjQuantity").value);
  const reason = document.getElementById("adjReason").value;

  if (!productId || !quantity || quantity <= 0 || !reason) {
    showToast("Please fill all required fields", "error");
    return;
  }

  // For removal, make quantity negative
  if (adjType === "REMOVE") {
    quantity = -quantity;
  }

  try {
    await api.createStockEntry({
      product_id: parseInt(productId),
      location_id: parseInt(locationId),
      quantity: quantity,
      reference_type: "ADJUSTMENT",
      remarks: reason,
    });

    showToast("Stock adjustment applied successfully!", "success");
    document.getElementById("adjustmentForm").reset();

    loadCurrentStock();
  } catch (error) {
    console.error("Failed to apply adjustment:", error);
    showToast(error.message || "Failed to apply adjustment", "error");
  }
}

// View stock ledger
async function viewLedger() {
  const productId = document.getElementById("ledgerProductSelect").value;
  const startDate = document.getElementById("ledgerStartDate").value;
  const endDate = document.getElementById("ledgerEndDate").value;

  if (!productId) {
    showToast("Please select a product", "error");
    return;
  }

  try {
    const filters = {};
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;

    const ledger = await api.getStockLedger(productId, filters);
    displayLedger(ledger);
  } catch (error) {
    console.error("Failed to load ledger:", error);
    showToast("Failed to load ledger data", "error");
  }
}

function displayLedger(ledger) {
  const tbody = document.getElementById("ledgerBody");

  if (!ledger || ledger.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">No ledger entries found</td></tr>';
    return;
  }

  tbody.innerHTML = ledger
    .map(
      (entry) => `
        <tr>
            <td>${formatDateTime(entry.transaction_date)}</td>
            <td>${getTransactionTypeBadge(entry.transaction_type)}</td>
            <td>${entry.quantity_in || 0}</td>
            <td>${entry.quantity_out || 0}</td>
            <td class="fw-bold">${entry.balance}</td>
            <td>${entry.reference_type || "-"}</td>
            <td>${escapeHtml(entry.remarks || "-")}</td>
        </tr>
    `,
    )
    .join("");
}

function getTransactionTypeBadge(type) {
  const badges = {
    STOCK_IN: '<span class="badge bg-success">Stock In</span>',
    STOCK_OUT: '<span class="badge bg-danger">Stock Out</span>',
    ADJUSTMENT: '<span class="badge bg-warning">Adjustment</span>',
    TRANSFER: '<span class="badge bg-info">Transfer</span>',
    REVERSAL: '<span class="badge bg-dark">Reversal</span>',
  };
  return badges[type] || `<span class="badge bg-secondary">${type}</span>`;
}

// Utility functions
function viewStockDetails(productId) {
  // Open product details modal or navigate to product view
  showToast("Product details feature coming soon", "info");
}

function quickStockEntry(productId) {
  // Pre-fill stock entry modal with product
  document.getElementById("entryProductId").value = productId;
  const modal = new bootstrap.Modal(document.getElementById("stockEntryModal"));
  modal.show();
}

function editProduct(productId) {
  showToast("Edit product feature coming soon", "info");
}

async function deleteProduct(productId) {
  if (confirm("Are you sure you want to delete this product?")) {
    showToast("Delete feature coming soon", "info");
  }
}

function formatDateTime(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("en-IN");
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toastId = "toast-" + Date.now();
  const bgClass =
    type === "error"
      ? "bg-danger"
      : type === "success"
        ? "bg-success"
        : "bg-info";

  const toastHtml = `
        <div id="${toastId}" class="toast-custom toast align-items-center text-white ${bgClass} border-0 mb-2" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${type === "error" ? "exclamation-circle" : "check-circle"} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

  container.insertAdjacentHTML("beforeend", toastHtml);
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
  toast.show();

  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}

// Export functions for global use
window.viewStockDetails = viewStockDetails;
window.quickStockEntry = quickStockEntry;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
