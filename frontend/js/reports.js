// Check authentication
if (!localStorage.getItem("token")) {
  window.location.href = "login.html";
}

let demandTrendChart, stockCategoryChart, topProductsChart, approvalTimesChart;

document.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  loadProductsForMovement();
  setupEventListeners();
  loadAnalytics();
});

function setupEventListeners() {
  document
    .getElementById("generateStockReport")
    ?.addEventListener("click", generateStockReport);
  document
    .getElementById("generateDemandReport")
    ?.addEventListener("click", generateDemandReport);
  document
    .getElementById("generateMovementReport")
    ?.addEventListener("click", generateMovementReport);
  document
    .getElementById("exportExcelBtn")
    ?.addEventListener("click", exportToExcel);
  document
    .getElementById("exportPdfBtn")
    ?.addEventListener("click", exportToPDF);
}

async function loadCategories() {
  try {
    const categories = await api.getCategories();
    const categorySelect = document.getElementById("stockReportCategory");
    if (categorySelect && categories) {
      categorySelect.innerHTML =
        '<option value="">All Categories</option>' +
        categories
          .map((c) => `<option value="${c.id}">${c.name}</option>`)
          .join("");
    }
  } catch (error) {
    console.error("Failed to load categories:", error);
  }
}

async function loadProductsForMovement() {
  try {
    const products = await api.getProducts();
    const productSelect = document.getElementById("movementProduct");
    if (productSelect && products) {
      productSelect.innerHTML =
        '<option value="">Select Product</option>' +
        products
          .map((p) => `<option value="${p.id}">${p.code} - ${p.name}</option>`)
          .join("");
    }
  } catch (error) {
    console.error("Failed to load products:", error);
  }
}

async function generateStockReport() {
  const locationId = document.getElementById("stockReportLocation").value;
  const categoryId = document.getElementById("stockReportCategory").value;
  const status = document.getElementById("stockReportStatus").value;

  try {
    const filters = {};
    if (locationId) filters.location_id = locationId;

    let stockData = await api.getCurrentStock(filters);

    // Apply category filter
    if (categoryId) {
      // You'll need to add category info to stock data
    }

    // Apply status filter
    if (status === "low") {
      stockData = stockData.filter((item) => item.balance <= item.min_stock);
    }

    displayStockReport(stockData);
  } catch (error) {
    console.error("Failed to generate stock report:", error);
    showToast("Failed to generate report", "error");
  }
}

function displayStockReport(data) {
  const tbody = document.getElementById("stockReportBody");

  if (!data || data.length === 0) {
    tbody.innerHTML =
      '<td><td colspan="8" class="text-center">No data found</td></tr>';
    return;
  }

  tbody.innerHTML = data
    .map(
      (item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><code>${escapeHtml(item.product_code)}</code></td>
            <td>${escapeHtml(item.product_name)}</td>
            <td>${escapeHtml(item.category_name || "Uncategorized")}</td>
            <td>${escapeHtml(item.location_name || "N/A")}</td>
            <td class="${item.balance <= item.min_stock ? "text-danger fw-bold" : ""}">
                ${item.balance} ${item.unit || "units"}
            </td>
            <td>${item.min_stock}</td>
            <td>${getStockStatusBadge(item.balance, item.min_stock)}</td>
        </tr>
    `,
    )
    .join("");
}

async function generateDemandReport() {
  const startDate = document.getElementById("demandStartDate").value;
  const endDate = document.getElementById("demandEndDate").value;
  const status = document.getElementById("demandStatus").value;

  try {
    const filters = {};
    if (status) filters.status = status;

    const demands = await api.getDemands(filters);

    // Filter by date range
    let filteredDemands = demands;
    if (startDate) {
      filteredDemands = filteredDemands.filter(
        (d) => d.created_at >= startDate,
      );
    }
    if (endDate) {
      filteredDemands = filteredDemands.filter((d) => d.created_at <= endDate);
    }

    displayDemandReport(filteredDemands);
  } catch (error) {
    console.error("Failed to generate demand report:", error);
    showToast("Failed to generate demand report", "error");
  }
}

function displayDemandReport(demands) {
  const tbody = document.getElementById("demandReportBody");

  if (!demands || demands.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center">No data found</td></tr>';
    return;
  }

  tbody.innerHTML = demands
    .map(
      (demand) => `
        <tr>
            <td><code>${escapeHtml(demand.demand_number)}</code></td>
            <td>${formatDate(demand.created_at)}</td>
            <td>${escapeHtml(demand.department?.name || "N/A")}</td>
            <td>${escapeHtml(demand.created_by?.full_name || "Unknown")}</td>
            <td>${demand.items?.length || 0}</td>
            <td>${demand.total_quantity || 0}</td>
            <td>${getStatusBadge(demand.status)}</td>
            <td>${demand.approved_at ? formatDate(demand.approved_at) : "-"}</td>
        </tr>
    `,
    )
    .join("");
}

async function generateMovementReport() {
  const productId = document.getElementById("movementProduct").value;
  const locationId = document.getElementById("movementLocation").value;
  const startDate = document.getElementById("movementStartDate").value;
  const endDate = document.getElementById("movementEndDate").value;

  if (!productId) {
    showToast("Please select a product", "error");
    return;
  }

  try {
    const filters = {};
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;

    const ledger = await api.getStockLedger(productId, filters);

    // Filter by location if needed
    let filteredLedger = ledger;
    if (locationId) {
      filteredLedger = ledger.filter(
        (entry) => entry.location_id == locationId,
      );
    }

    displayMovementReport(filteredLedger);
  } catch (error) {
    console.error("Failed to generate movement report:", error);
    showToast("Failed to generate movement report", "error");
  }
}

function displayMovementReport(ledger) {
  const tbody = document.getElementById("movementBody");

  if (!ledger || ledger.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">No movement data found</td></tr>';
    return;
  }

  tbody.innerHTML = ledger
    .map(
      (entry) => `
        <tr>
            <td>${formatDateTime(entry.transaction_date)}</td>
            <td>${getTransactionTypeBadge(entry.transaction_type)}</td>
            <td>${escapeHtml(entry.product?.name || "N/A")}</td>
            <td class="text-success">${entry.quantity_in || 0}</td>
            <td class="text-danger">${entry.quantity_out || 0}</td>
            <td class="fw-bold">${entry.balance}</td>
            <td>${entry.reference_type || "-"}</td>
        </tr>
    `,
    )
    .join("");
}

async function loadAnalytics() {
  try {
    // Demand trend data (last 6 months)
    const demandTrendData = {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      values: [45, 52, 48, 61, 55, 67],
    };

    const demandCtx = document
      .getElementById("demandTrendChart")
      ?.getContext("2d");
    if (demandCtx) {
      demandTrendChart = new Chart(demandCtx, {
        type: "line",
        data: {
          labels: demandTrendData.labels,
          datasets: [
            {
              label: "Number of Demands",
              data: demandTrendData.values,
              borderColor: "#667eea",
              backgroundColor: "rgba(102, 126, 234, 0.1)",
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: "bottom" },
          },
        },
      });
    }

    // Stock by category
    const categoryData = {
      labels: ["Electronics", "Furniture", "Stationery", "Others"],
      values: [35, 25, 30, 10],
    };

    const categoryCtx = document
      .getElementById("stockCategoryChart")
      ?.getContext("2d");
    if (categoryCtx) {
      stockCategoryChart = new Chart(categoryCtx, {
        type: "doughnut",
        data: {
          labels: categoryData.labels,
          datasets: [
            {
              data: categoryData.values,
              backgroundColor: ["#667eea", "#764ba2", "#f59e0b", "#10b981"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: "bottom" },
          },
        },
      });
    }

    // Top products
    const topProductsCtx = document
      .getElementById("topProductsChart")
      ?.getContext("2d");
    if (topProductsCtx) {
      topProductsChart = new Chart(topProductsCtx, {
        type: "bar",
        data: {
          labels: [
            "Product A",
            "Product B",
            "Product C",
            "Product D",
            "Product E",
          ],
          datasets: [
            {
              label: "Units Sold/Moved",
              data: [450, 380, 290, 210, 150],
              backgroundColor: "#667eea",
              borderRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: "bottom" },
          },
          scales: {
            y: { beginAtZero: true },
          },
        },
      });
    }
  } catch (error) {
    console.error("Failed to load analytics:", error);
  }
}

function exportToExcel() {
  showToast("Excel export feature coming soon", "info");
}

function exportToPDF() {
  showToast("PDF export feature coming soon", "info");
}

function getStockStatusBadge(balance, minStock) {
  if (balance <= 0) return '<span class="badge bg-danger">Out of Stock</span>';
  if (balance <= minStock)
    return '<span class="badge bg-warning">Low Stock</span>';
  return '<span class="badge bg-success">Good</span>';
}

function getStatusBadge(status) {
  const badges = {
    DRAFT: '<span class="badge bg-secondary">Draft</span>',
    SUBMITTED: '<span class="badge bg-info">Submitted</span>',
    APPROVED: '<span class="badge bg-success">Approved</span>',
    REJECTED: '<span class="badge bg-danger">Rejected</span>',
  };
  return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function getTransactionTypeBadge(type) {
  const badges = {
    STOCK_IN: '<span class="badge bg-success">Stock In</span>',
    STOCK_OUT: '<span class="badge bg-danger">Stock Out</span>',
    ADJUSTMENT: '<span class="badge bg-warning">Adjustment</span>',
  };
  return badges[type] || `<span class="badge bg-secondary">${type}</span>`;
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN");
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
