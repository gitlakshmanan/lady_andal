// Check authentication
if (!localStorage.getItem("token")) {
  window.location.href = "login.html";
}

let currentDemands = [];

document.addEventListener("DOMContentLoaded", () => {
  loadMyDemands();
  loadPendingApprovals();
  loadProductSelects();
  setupEventListeners();
});

function setupEventListeners() {
  document
    .getElementById("addItemBtn")
    ?.addEventListener("click", addDemandItem);
  document
    .getElementById("submitDemandBtn")
    ?.addEventListener("click", submitNewDemand);

  // Tab change listeners
  document.querySelectorAll('a[data-bs-toggle="tab"]').forEach((tab) => {
    tab.addEventListener("shown.bs.tab", (e) => {
      if (e.target.href.includes("#pendingApprovals")) {
        loadPendingApprovals();
      } else if (e.target.href.includes("#myDemands")) {
        loadMyDemands();
      }
    });
  });
}

async function loadMyDemands() {
  try {
    const demands = await api.getDemands();
    currentDemands = demands;
    displayMyDemands(demands);
  } catch (error) {
    console.error("Failed to load demands:", error);
    showToast("Failed to load demands", "error");
  }
}

function displayMyDemands(demands) {
  const tbody = document.getElementById("demandsBody");

  if (!demands || demands.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted">No demands found</td></tr>';
    return;
  }

  tbody.innerHTML = demands
    .map(
      (demand) => `
        <tr>
            <td><code>${escapeHtml(demand.demand_number)}</code></td>
            <td>${formatDate(demand.created_at)}</td>
            <td>${getStatusBadge(demand.status)}</td>
            <td>${demand.total_quantity || 0}</td>
            <td>${demand.priority || "NORMAL"}</td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="viewDemand(${demand.id})">
                    <i class="bi bi-eye"></i>
                </button>
                ${
                  demand.status === "DRAFT"
                    ? `
                    <button class="btn btn-sm btn-outline-success ms-1" onclick="editDemand(${demand.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary ms-1" onclick="submitDemandForApproval(${demand.id})">
                        <i class="bi bi-send"></i>
                    </button>
                `
                    : ""
                }
                ${
                  demand.status === "SUBMITTED" && hasApprovePermission()
                    ? `
                    <button class="btn btn-sm btn-outline-success ms-1" onclick="approveDemandModal(${demand.id})">
                        <i class="bi bi-check-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger ms-1" onclick="rejectDemand(${demand.id})">
                        <i class="bi bi-x-circle"></i>
                    </button>
                `
                    : ""
                }
             </td>
         </tr>
    `,
    )
    .join("");
}

async function loadPendingApprovals() {
  try {
    const pending = await api.getPendingApprovals();
    displayPendingApprovals(pending.demands || []);
  } catch (error) {
    console.error("Failed to load pending approvals:", error);
  }
}

function displayPendingApprovals(demands) {
  const tbody = document.getElementById("pendingBody");

  if (!demands || demands.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted">No pending approvals found</td></tr>';
    return;
  }

  tbody.innerHTML = demands
    .map(
      (demand) => `
        <tr>
            <td><code>${escapeHtml(demand.demand_number)}</code></td>
            <td>${escapeHtml(demand.created_by?.full_name || "Unknown")}</td>
            <td>${formatDate(demand.created_at)}</td>
            <td>${demand.total_quantity || 0}</td>
            <td>${demand.priority || "NORMAL"}</td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="viewDemand(${demand.id})">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success ms-1" onclick="approveDemandModal(${demand.id})">
                    <i class="bi bi-check-circle"></i> Approve
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1" onclick="rejectDemand(${demand.id})">
                    <i class="bi bi-x-circle"></i> Reject
                </button>
              </td>
          </tr>
    `,
    )
    .join("");
}

async function loadProductSelects() {
  try {
    const products = await api.getProducts();
    const productSelects = document.querySelectorAll(".product-select");
    productSelects.forEach((select) => {
      select.innerHTML =
        '<option value="">Select Product</option>' +
        products
          .map(
            (p) =>
              `<option value="${p.id}">${p.code} - ${p.name} (${p.unit})</option>`,
          )
          .join("");
    });
  } catch (error) {
    console.error("Failed to load products:", error);
  }
}

function addDemandItem() {
  const container = document.getElementById("itemsContainer");
  const itemCount = container.children.length;

  const newItem = `
        <div class="row mb-2 item-row">
            <div class="col-md-8">
                <select class="form-select product-select" data-index="${itemCount}" required>
                    <option value="">Select Product</option>
                </select>
            </div>
            <div class="col-md-3">
                <input type="number" class="form-control quantity" placeholder="Quantity" required>
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-danger remove-item">×</button>
            </div>
        </div>
    `;

  container.insertAdjacentHTML("beforeend", newItem);

  // Load products for the new select
  loadProductSelects();

  // Add remove event listener
  const removeBtn = container.lastElementChild.querySelector(".remove-item");
  removeBtn.addEventListener("click", () =>
    removeBtn.closest(".item-row").remove(),
  );
}

async function submitNewDemand() {
  const locationId = document.getElementById("locationId").value;
  const departmentId = document.getElementById("departmentId").value;
  const priority = document.getElementById("priority").value;
  const requiredByDate = document.getElementById("requiredByDate").value;
  const remarks = document.getElementById("remarks").value;

  // Collect items
  const items = [];
  const itemRows = document.querySelectorAll("#itemsContainer .item-row");

  for (const row of itemRows) {
    const productId = row.querySelector(".product-select").value;
    const quantity = row.querySelector(".quantity").value;

    if (productId && quantity && quantity > 0) {
      items.push({
        product_id: parseInt(productId),
        quantity: parseFloat(quantity),
        remarks: "",
      });
    }
  }

  if (items.length === 0) {
    showToast("Please add at least one item", "error");
    return;
  }

  try {
    // Create demand
    const demand = await api.createDemand({
      location_id: parseInt(locationId),
      department_id: parseInt(departmentId),
      priority: priority,
      required_by_date: requiredByDate || null,
      remarks: remarks,
      items: items,
    });

    // Submit for approval
    await api.submitDemand(demand.id);

    showToast("Demand created and submitted successfully!", "success");

    // Close modal and reset
    bootstrap.Modal.getInstance(
      document.getElementById("createDemandModal"),
    ).hide();
    document.getElementById("demandForm").reset();
    document.getElementById("itemsContainer").innerHTML = "";
    addDemandItem(); // Add one empty item row

    // Refresh lists
    loadMyDemands();
    loadPendingApprovals();
  } catch (error) {
    console.error("Failed to submit demand:", error);
    showToast(error.message || "Failed to submit demand", "error");
  }
}

async function submitDemandForApproval(demandId) {
  if (confirm("Are you sure you want to submit this demand for approval?")) {
    try {
      await api.submitDemand(demandId);
      showToast("Demand submitted for approval", "success");
      loadMyDemands();
      loadPendingApprovals();
    } catch (error) {
      showToast(error.message || "Failed to submit demand", "error");
    }
  }
}

function approveDemandModal(demandId) {
  const remarks = prompt("Enter approval remarks (optional):");
  approveDemand(demandId, remarks);
}

async function approveDemand(demandId, remarks) {
  try {
    await api.approveDemand(demandId, remarks);
    showToast("Demand approved successfully!", "success");
    loadMyDemands();
    loadPendingApprovals();
  } catch (error) {
    showToast(error.message || "Failed to approve demand", "error");
  }
}

async function rejectDemand(demandId) {
  const remarks = prompt("Enter rejection reason:");
  if (remarks) {
    try {
      await api.rejectDemand(demandId, remarks);
      showToast("Demand rejected", "info");
      loadMyDemands();
      loadPendingApprovals();
    } catch (error) {
      showToast(error.message || "Failed to reject demand", "error");
    }
  }
}

function viewDemand(demandId) {
  showToast("View demand details - Coming soon", "info");
}

function editDemand(demandId) {
  showToast("Edit demand - Coming soon", "info");
}

function hasApprovePermission() {
  // Check if user has approve permission
  // For now, return true
  return true;
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN");
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

// Export global functions
window.viewDemand = viewDemand;
window.editDemand = editDemand;
window.submitDemandForApproval = submitDemandForApproval;
window.approveDemandModal = approveDemandModal;
window.rejectDemand = rejectDemand;
