// Check authentication
if (!localStorage.getItem("token")) {
  window.location.href = "login.html";
}

// Global variables
let demandChart = null;
let categoryChart = null;

// Load dashboard on page load
document.addEventListener("DOMContentLoaded", async () => {
  await loadUserInfo();
  await loadDashboardStats();
  await loadLowStockItems();
  await loadRecentDemands();
  await loadCharts();
});

// Load user information
async function loadUserInfo() {
  try {
    const user = await api.getCurrentUser();
    const userNameElement = document.getElementById("userName");
    if (userNameElement && user) {
      userNameElement.textContent = user.full_name || user.username;
    }
  } catch (error) {
    console.error("Failed to load user info:", error);
  }
}

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    // Get low stock items
    const lowStock = await api.getCurrentStock({ low_stock_only: true });
    document.getElementById("lowStock").textContent = lowStock.length;

    // Get pending approvals
    const pending = await api.getPendingApprovals();
    document.getElementById("pendingApprovals").textContent =
      pending.count || 0;

    // Get active demands
    const demands = await api.getDemands({
      status: "SUBMITTED,REVIEWED,APPROVED",
    });
    document.getElementById("activeDemands").textContent = demands.length || 0;

    // For total stock value - you might need to calculate this
    const allStock = await api.getCurrentStock();
    const totalValue = allStock.reduce(
      (sum, item) => sum + item.balance * 100,
      0,
    ); // Assuming avg price 100
    document.getElementById("totalStock").textContent =
      `₹${totalValue.toLocaleString()}`;
  } catch (error) {
    console.error("Failed to load dashboard stats:", error);
    showToast("Failed to load dashboard statistics", "error");
  }
}

// Load low stock items table
async function loadLowStockItems() {
  try {
    const lowStock = await api.getCurrentStock({ low_stock_only: true });
    const tbody = document.getElementById("lowStockBody");

    if (lowStock.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        <i class="bi bi-check-circle me-2"></i>No low stock items
                    </td>
                </tr>
            `;
      return;
    }

    tbody.innerHTML = lowStock
      .map(
        (item) => `
            <tr>
                <td>
                    <strong>${escapeHtml(item.product_name)}</strong>
                </td>
                <td><code>${escapeHtml(item.product_code)}</code></td>
                <td class="${item.balance <= item.min_stock ? "text-danger fw-bold" : ""}">
                    ${item.balance} ${item.unit || "units"}
                </td>
                <td>${item.min_stock}</td>
                <td>
                    <span class="badge bg-danger">LOW STOCK</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.location.href='inventory.html'">
                        <i class="bi bi-plus-circle"></i> Reorder
                    </button>
                </td>
            </tr>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Failed to load low stock items:", error);
    document.getElementById("lowStockBody").innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>Failed to load data
                </td>
            </tr>
        `;
  }
}

// Load recent demands
async function loadRecentDemands() {
  try {
    const demands = await api.getDemands({ limit: 5 });
    const tbody = document.getElementById("recentDemandsBody");

    if (!demands || demands.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">No demands found</td>
                </tr>
            `;
      return;
    }

    tbody.innerHTML = demands
      .map(
        (demand) => `
            <tr onclick="window.location.href='demands.html?id=${demand.id}'" style="cursor: pointer;">
                <td><code>${escapeHtml(demand.demand_number)}</code></td>
                <td>${formatDate(demand.created_at)}</td>
                <td>${escapeHtml(demand.department?.name || "N/A")}</td>
                <td>${getStatusBadge(demand.status)}</td>
                <td>${demand.total_quantity || 0}</td>
            </tr>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Failed to load recent demands:", error);
  }
}

// Load charts
async function loadCharts() {
  try {
    // Demand trend data (you might want to get this from API)
    const demandData = {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      values: [45, 52, 48, 61, 55, 67],
    };

    // Demand Chart
    const demandCtx = document.getElementById("demandChart").getContext("2d");
    demandChart = new Chart(demandCtx, {
      type: "line",
      data: {
        labels: demandData.labels,
        datasets: [
          {
            label: "Demands",
            data: demandData.values,
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
          legend: {
            position: "bottom",
          },
        },
      },
    });

    // Category distribution
    const categoryData = {
      labels: ["Electronics", "Furniture", "Stationery", "Others"],
      values: [35, 25, 30, 10],
    };

    const categoryCtx = document
      .getElementById("categoryChart")
      .getContext("2d");
    categoryChart = new Chart(categoryCtx, {
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
          legend: {
            position: "bottom",
          },
        },
      },
    });
  } catch (error) {
    console.error("Failed to load charts:", error);
  }
}

// Utility Functions
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadge(status) {
  const badges = {
    DRAFT: '<span class="badge bg-secondary">Draft</span>',
    SUBMITTED: '<span class="badge bg-info">Submitted</span>',
    REVIEWED: '<span class="badge bg-primary">Reviewed</span>',
    APPROVED: '<span class="badge bg-success">Approved</span>',
    ALLOCATED: '<span class="badge bg-success">Allocated</span>',
    DISPATCHED: '<span class="badge bg-warning">Dispatched</span>',
    RECEIVED: '<span class="badge bg-info">Received</span>',
    REJECTED: '<span class="badge bg-danger">Rejected</span>',
    REVERSED: '<span class="badge bg-dark">Reversed</span>',
  };
  return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = "info") {
  // Create toast container if not exists
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

  // Remove after hide
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}

// Logout function
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// Event listeners
document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  logout();
});

document.getElementById("logoutDropdown")?.addEventListener("click", (e) => {
  e.preventDefault();
  logout();
});

// Auto-refresh every 30 seconds
setInterval(() => {
  if (document.visibilityState === "visible") {
    loadDashboardStats();
    loadLowStockItems();
  }
}, 30000);
