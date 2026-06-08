// Check authentication
if (!localStorage.getItem("token")) {
  window.location.href = "login.html";
}

let currentTransferId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadAllTransfers();
  loadPendingTransfers();
  loadMyTransfers();
  loadProductsForTransfer();
  setupEventListeners();
});

function setupEventListeners() {
  document
    .getElementById("filterTransfersBtn")
    ?.addEventListener("click", loadAllTransfers);
  document
    .getElementById("addTransferItemBtn")
    ?.addEventListener("click", addTransferItem);
  document
    .getElementById("saveTransferBtn")
    ?.addEventListener("click", createTransfer);
  document
    .getElementById("confirmApproveBtn")
    ?.addEventListener("click", confirmApprove);

  // Tab change listeners
  document.querySelectorAll('button[data-bs-toggle="tab"]').forEach((tab) => {
    tab.addEventListener("shown.bs.tab", (e) => {
      const targetId = e.target.getAttribute("data-bs-target");
      if (targetId === "#allTransfers") loadAllTransfers();
      else if (targetId === "#pendingTransfers") loadPendingTransfers();
      else if (targetId === "#myTransfers") loadMyTransfers();
    });
  });
}

async function loadAllTransfers() {
  try {
    const status = document.getElementById("transferStatusFilter")?.value;
    const startDate = document.getElementById("transferStartDate")?.value;
    const endDate = document.getElementById("transferEndDate")?.value;

    const filters = {};
    if (status) filters.status = status;
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;

    const transfers = await api.getTransfers(filters);
    displayAllTransfers(transfers);
  } catch (error) {
    console.error("Failed to load transfers:", error);
    showToast("Failed to load transfers", "error");
  }
}

function displayAllTransfers(transfers) {
  const tbody = document.getElementById("transfersBody");

  if (!transfers || transfers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center">No transfers found</td></tr>';
    return;
  }

  tbody.innerHTML = transfers
    .map(
      (transfer) => `
        <tr>
            <td><code>${escapeHtml(transfer.transfer_number)}</code></td>
            <td>${formatDate(transfer.created_at)}</td>
            <td>${escapeHtml(transfer.from_location?.name || "N/A")}</td>
            <td>${escapeHtml(transfer.to_location?.name || "N/A")}</td>
            <td>${transfer.items?.length || 0}</td>
            <td>${transfer.total_quantity || 0}</td>
            <td>${getTransferStatusBadge(transfer.status)}</td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="viewTransfer(${transfer.id})">
                    <i class="bi bi-eye"></i>
                </button>
                ${
                  transfer.status === "SUBMITTED"
                    ? `
                    <button class="btn btn-sm btn-outline-success ms-1" onclick="showApproveModal(${transfer.id})">
                        <i class="bi bi-check-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger ms-1" onclick="rejectTransfer(${transfer.id})">
                        <i class="bi bi-x-circle"></i>
                    </button>
                `
                    : ""
                }
                ${
                  transfer.status === "IN_TRANSIT"
                    ? `
                    <button class="btn btn-sm btn-outline-primary ms-1" onclick="receiveTransfer(${transfer.id})">
                        <i class="bi bi-box-seam"></i> Receive
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

async function loadPendingTransfers() {
  try {
    const transfers = await api.getTransfers({ status: "SUBMITTED" });
    const pendingCount = transfers?.length || 0;
    document.getElementById("pendingCount").textContent = pendingCount;
    displayPendingTransfers(transfers);
  } catch (error) {
    console.error("Failed to load pending transfers:", error);
  }
}

function displayPendingTransfers(transfers) {
  const tbody = document.getElementById("pendingTransfersBody");

  if (!transfers || transfers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">No pending transfers</td></tr>';
    return;
  }

  tbody.innerHTML = transfers
    .map(
      (transfer) => `
        <tr>
            <td><code>${escapeHtml(transfer.transfer_number)}</code></td>
            <td>${formatDate(transfer.created_at)}</td>
            <td>${escapeHtml(transfer.from_location?.name || "N/A")}</td>
            <td>${escapeHtml(transfer.to_location?.name || "N/A")}</td>
            <td>${escapeHtml(transfer.created_by?.full_name || "Unknown")}</td>
            <td>${transfer.total_quantity || 0}</td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="viewTransfer(${transfer.id})">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success ms-1" onclick="showApproveModal(${transfer.id})">
                    <i class="bi bi-check-circle"></i> Approve
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1" onclick="rejectTransfer(${transfer.id})">
                    <i class="bi bi-x-circle"></i> Reject
                </button>
             </td>
         </tr>
    `,
    )
    .join("");
}

async function loadMyTransfers() {
  try {
    // Load transfers created by current user
    const transfers = await api.getTransfers({ created_by: "me" });
    displayMyTransfers(transfers);
  } catch (error) {
    console.error("Failed to load my transfers:", error);
  }
}

function displayMyTransfers(transfers) {
  const tbody = document.getElementById("myTransfersBody");

  if (!transfers || transfers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">No transfers found</td></tr>';
    return;
  }

  tbody.innerHTML = transfers
    .map(
      (transfer) => `
        <tr>
            <td><code>${escapeHtml(transfer.transfer_number)}</code></td>
            <td>${formatDate(transfer.created_at)}</td>
            <td>${escapeHtml(transfer.from_location?.name || "N/A")}</td>
            <td>${escapeHtml(transfer.to_location?.name || "N/A")}</td>
            <td>${getTransferStatusBadge(transfer.status)}</td>
            <td>${transfer.items?.length || 0}</td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="viewTransfer(${transfer.id})">
                    <i class="bi bi-eye"></i>
                </button>
                ${
                  transfer.status === "DRAFT"
                    ? `
                    <button class="btn btn-sm btn-outline-primary ms-1" onclick="submitTransfer(${transfer.id})">
                        <i class="bi bi-send"></i> Submit
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

async function loadProductsForTransfer() {
  try {
    const products = await api.getProducts();
    const productSelects = document.querySelectorAll(".product-select");
    productSelects.forEach((select) => {
      select.innerHTML =
        '<option value="">Select Product</option>' +
        products
          .map(
            (p) =>
              `<option value="${p.id}">${p.code} - ${p.name} (${p.unit}) - Stock: ${p.current_stock || 0}</option>`,
          )
          .join("");
    });
  } catch (error) {
    console.error("Failed to load products:", error);
  }
}

function addTransferItem() {
  const container = document.getElementById("transferItemsContainer");

  const newItem = `
        <div class="row mb-2 item-row">
            <div class="col-md-7">
                <select class="form-select product-select" required>
                    <option value="">Select Product</option>
                </select>
            </div>
            <div class="col-md-3">
                <input type="number" class="form-control quantity" placeholder="Quantity" required>
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-danger remove-item">Remove</button>
            </div>
        </div>
    `;

  container.insertAdjacentHTML("beforeend", newItem);

  // Load products for the new select
  loadProductsForTransfer();

  // Add remove event listener
  const removeBtn = container.lastElementChild.querySelector(".remove-item");
  removeBtn.addEventListener("click", () =>
    removeBtn.closest(".item-row").remove(),
  );
}

async function createTransfer() {
  const fromLocationId = document.getElementById("fromLocationId").value;
  const toLocationId = document.getElementById("toLocationId").value;
  const transferDate = document.getElementById("transferDate").value;
  const expectedDelivery = document.getElementById("expectedDelivery").value;
  const remarks = document.getElementById("transferRemarks").value;

  if (!fromLocationId || !toLocationId) {
    showToast("Please select source and destination locations", "error");
    return;
  }

  if (fromLocationId === toLocationId) {
    showToast("Source and destination cannot be the same", "error");
    return;
  }

  // Collect items
  const items = [];
  const itemRows = document.querySelectorAll(
    "#transferItemsContainer .item-row",
  );

  for (const row of itemRows) {
    const productId = row.querySelector(".product-select").value;
    const quantity = row.querySelector(".quantity").value;

    if (productId && quantity && quantity > 0) {
      items.push({
        product_id: parseInt(productId),
        quantity: parseFloat(quantity),
      });
    }
  }

  if (items.length === 0) {
    showToast("Please add at least one item", "error");
    return;
  }

  try {
    const transfer = await api.createTransfer({
      from_location_id: parseInt(fromLocationId),
      to_location_id: parseInt(toLocationId),
      transfer_date: transferDate || new Date().toISOString().split("T")[0],
      expected_delivery_date: expectedDelivery || null,
      remarks: remarks,
      items: items,
    });

    showToast("Transfer created successfully!", "success");

    // Close modal and reset
    bootstrap.Modal.getInstance(
      document.getElementById("createTransferModal"),
    ).hide();
    document.getElementById("transferForm").reset();
    document.getElementById("transferItemsContainer").innerHTML = "";
    addTransferItem(); // Add one empty item row

    // Refresh lists
    loadAllTransfers();
    loadMyTransfers();
  } catch (error) {
    console.error("Failed to create transfer:", error);
    showToast(error.message || "Failed to create transfer", "error");
  }
}

async function submitTransfer(transferId) {
  if (confirm("Are you sure you want to submit this transfer for approval?")) {
    try {
      await api.submitTransfer(transferId);
      showToast("Transfer submitted for approval", "success");
      loadAllTransfers();
      loadMyTransfers();
      loadPendingTransfers();
    } catch (error) {
      showToast(error.message || "Failed to submit transfer", "error");
    }
  }
}

function showApproveModal(transferId) {
  currentTransferId = transferId;
  const modal = new bootstrap.Modal(
    document.getElementById("approveTransferModal"),
  );
  modal.show();
}

async function confirmApprove() {
  const remarks = document.getElementById("approveRemarks").value;

  try {
    await api.approveTransfer(currentTransferId, remarks);
    showToast("Transfer approved successfully!", "success");

    bootstrap.Modal.getInstance(
      document.getElementById("approveTransferModal"),
    ).hide();
    document.getElementById("approveRemarks").value = "";

    loadAllTransfers();
    loadPendingTransfers();
    loadMyTransfers();
  } catch (error) {
    console.error("Failed to approve transfer:", error);
    showToast(error.message || "Failed to approve transfer", "error");
  }
}

async function rejectTransfer(transferId) {
  const remarks = prompt("Enter rejection reason:");
  if (remarks) {
    try {
      await api.rejectTransfer(transferId, remarks);
      showToast("Transfer rejected", "info");
      loadAllTransfers();
      loadPendingTransfers();
      loadMyTransfers();
    } catch (error) {
      showToast(error.message || "Failed to reject transfer", "error");
    }
  }
}

async function receiveTransfer(transferId) {
  if (
    confirm(
      "Confirm receipt of this transfer? The stock will be added to destination location.",
    )
  ) {
    try {
      await api.receiveTransfer(transferId);
      showToast("Transfer received successfully! Stock updated.", "success");
      loadAllTransfers();
      loadMyTransfers();
    } catch (error) {
      showToast(error.message || "Failed to receive transfer", "error");
    }
  }
}

function viewTransfer(transferId) {
  showToast("View transfer details - Coming soon", "info");
}

function getTransferStatusBadge(status) {
  const badges = {
    DRAFT: '<span class="badge bg-secondary">Draft</span>',
    SUBMITTED: '<span class="badge bg-info">Pending Approval</span>',
    APPROVED: '<span class="badge bg-success">Approved</span>',
    IN_TRANSIT: '<span class="badge bg-warning">In Transit</span>',
    RECEIVED: '<span class="badge bg-primary">Received</span>',
    REJECTED: '<span class="badge bg-danger">Rejected</span>',
  };
  return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN");
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
window.viewTransfer = viewTransfer;
window.submitTransfer = submitTransfer;
window.showApproveModal = showApproveModal;
window.rejectTransfer = rejectTransfer;
window.receiveTransfer = receiveTransfer;
