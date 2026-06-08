// Check authentication
if (!localStorage.getItem("token")) {
  window.location.href = "login.html";
}

let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

document.addEventListener("DOMContentLoaded", () => {
  loadAuditSummary();
  loadAuditLogs();
  loadUsersForFilter();
  setupEventListeners();
});

function setupEventListeners() {
  document
    .getElementById("applyFiltersBtn")
    ?.addEventListener("click", applyFilters);
  document.getElementById("refreshAuditBtn")?.addEventListener("click", () => {
    currentFilters = {};
    clearFilters();
    loadAuditLogs();
    loadAuditSummary();
  });
  document
    .getElementById("clearFiltersBtn")
    ?.addEventListener("click", clearFilters);
  document
    .getElementById("exportAuditBtn")
    ?.addEventListener("click", exportAuditLog);
  document.getElementById("searchInput")?.addEventListener("keyup", (e) => {
    if (e.key === "Enter") applyFilters();
  });
}

async function loadAuditSummary() {
  try {
    const summary = await api.getAuditSummary();
    if (summary) {
      document.getElementById("totalActivities").textContent =
        summary.total || 0;
      document.getElementById("todayActivities").textContent =
        summary.today || 0;
      document.getElementById("uniqueUsers").textContent =
        summary.unique_users || 0;
      document.getElementById("criticalEvents").textContent =
        summary.critical || 0;
    }
  } catch (error) {
    console.error("Failed to load audit summary:", error);
  }
}

async function loadAuditLogs(page = 1) {
  try {
    const filters = {
      ...currentFilters,
      page: page,
      limit: 20,
    };

    const response = await api.getAuditLogs(filters);

    if (response) {
      displayAuditLogs(response.data || response);
      if (response.total_pages) {
        totalPages = response.total_pages;
        currentPage = response.current_page || page;
        setupPagination();
      }
    }
  } catch (error) {
    console.error("Failed to load audit logs:", error);
    document.getElementById("auditBody").innerHTML = `
            <tr><td colspan="7" class="text-center text-danger">
                <i class="bi bi-exclamation-triangle"></i> Failed to load audit logs
            </td></tr>
        `;
  }
}

function displayAuditLogs(logs) {
  const tbody = document.getElementById("auditBody");

  if (!logs || logs.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-muted">No audit logs found</td></tr>';
    return;
  }

  tbody.innerHTML = logs
    .map(
      (log) => `
        <tr class="${log.severity === "CRITICAL" ? "table-danger" : log.severity === "WARNING" ? "table-warning" : ""}">
            <td style="white-space: nowrap;">${formatDateTime(log.timestamp)}</td>
            <td>
                <i class="bi bi-person-circle"></i>
                ${escapeHtml(log.user_name || log.user?.full_name || "Unknown")}
                ${log.user_id ? `<small class="text-muted d-block">ID: ${log.user_id}</small>` : ""}
            </td>
            <td>
                <span class="badge ${getActionBadgeClass(log.action)}">
                    ${formatActionName(log.action)}
                </span>
            </td>
            <td>${escapeHtml(log.description || log.action)}</td>
            <td><code>${escapeHtml(log.ip_address || "-")}</code></td>
            <td>${getSeverityBadge(log.severity)}</td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="viewAuditDetails(${log.id})">
                    <i class="bi bi-eye"></i> View
                </button>
            </td>
        </tr>
    `,
    )
    .join("");
}

function getActionBadgeClass(action) {
  const badges = {
    LOGIN: "bg-success",
    LOGOUT: "bg-secondary",
    CREATE_DEMAND: "bg-primary",
    APPROVE_DEMAND: "bg-success",
    REJECT_DEMAND: "bg-danger",
    STOCK_ENTRY: "bg-info",
    STOCK_ADJUSTMENT: "bg-warning",
    CREATE_TRANSFER: "bg-primary",
    APPROVE_TRANSFER: "bg-success",
    UPDATE_USER: "bg-secondary",
    DELETE: "bg-danger",
  };
  return badges[action] || "bg-secondary";
}

function formatActionName(action) {
  if (!action) return "Unknown";
  return action
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function getSeverityBadge(severity) {
  const badges = {
    INFO: '<span class="badge bg-info">Info</span>',
    WARNING: '<span class="badge bg-warning">Warning</span>',
    CRITICAL: '<span class="badge bg-danger">Critical</span>',
  };
  return badges[severity] || '<span class="badge bg-secondary">Unknown</span>';
}

async function loadUsersForFilter() {
  try {
    const users = await api.getUsers();
    const userSelect = document.getElementById("userFilter");
    if (userSelect && users) {
      userSelect.innerHTML =
        '<option value="">All Users</option>' +
        users
          .map(
            (u) =>
              `<option value="${u.id}">${escapeHtml(u.full_name || u.username)}</option>`,
          )
          .join("");
    }
  } catch (error) {
    console.error("Failed to load users:", error);
  }
}

function applyFilters() {
  currentFilters = {
    start_date: document.getElementById("startDate").value,
    end_date: document.getElementById("endDate").value,
    user_id: document.getElementById("userFilter").value,
    action: document.getElementById("actionFilter").value,
    severity: document.getElementById("severityFilter").value,
    search: document.getElementById("searchInput").value,
  };

  // Remove empty filters
  Object.keys(currentFilters).forEach((key) => {
    if (!currentFilters[key]) delete currentFilters[key];
  });

  currentPage = 1;
  loadAuditLogs();
}

function clearFilters() {
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("userFilter").value = "";
  document.getElementById("actionFilter").value = "";
  document.getElementById("severityFilter").value = "";
  document.getElementById("searchInput").value = "";

  currentFilters = {};
  currentPage = 1;
  loadAuditLogs();
}

function setupPagination() {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  let html = "";

  // Previous button
  html += `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>
        </li>
    `;

  // Page numbers
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    html += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(1)">1</a></li>`;
    if (startPage > 2)
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1)
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    html += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${totalPages})">${totalPages}</a></li>`;
  }

  // Next button
  html += `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
        </li>
    `;

  pagination.innerHTML = html;
}

function changePage(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  loadAuditLogs(page);
}

async function viewAuditDetails(logId) {
  try {
    const log = await api.getAuditLogById(logId);
    if (log) {
      document.getElementById("detailTimestamp").textContent = formatDateTime(
        log.timestamp,
      );
      document.getElementById("detailUser").textContent =
        `${log.user_name || log.user?.full_name || "Unknown"} (ID: ${log.user_id})`;
      document.getElementById("detailAction").textContent = formatActionName(
        log.action,
      );
      document.getElementById("detailIp").textContent = log.ip_address || "-";
      document.getElementById("detailOldValue").textContent = JSON.stringify(
        log.old_value || {},
        null,
        2,
      );
      document.getElementById("detailNewValue").textContent = JSON.stringify(
        log.new_value || {},
        null,
        2,
      );

      const modal = new bootstrap.Modal(
        document.getElementById("detailsModal"),
      );
      modal.show();
    }
  } catch (error) {
    console.error("Failed to load audit details:", error);
    showToast("Failed to load audit details", "error");
  }
}

async function exportAuditLog() {
  try {
    const filters = { ...currentFilters };
    const logs = await api.getAuditLogs({ ...filters, limit: 1000 });

    if (!logs || logs.length === 0) {
      showToast("No data to export", "warning");
      return;
    }

    // Convert to CSV
    const headers = [
      "Timestamp",
      "User",
      "Action",
      "Description",
      "IP Address",
      "Severity",
    ];
    const csvData = logs.map((log) => [
      formatDateTime(log.timestamp),
      log.user_name || log.user?.full_name || "Unknown",
      log.action,
      log.description || log.action,
      log.ip_address || "",
      log.severity,
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast("Audit log exported successfully", "success");
  } catch (error) {
    console.error("Failed to export audit log:", error);
    showToast("Failed to export audit log", "error");
  }
}

function formatDateTime(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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
        : type === "warning"
          ? "bg-warning"
          : "bg-info";

  const toastHtml = `
        <div id="${toastId}" class="toast-custom toast align-items-center text-white ${bgClass} border-0 mb-2" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${type === "error" ? "exclamation-circle" : type === "success" ? "check-circle" : "info-circle"} me-2"></i>
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

// Export for global use
window.viewAuditDetails = viewAuditDetails;
window.changePage = changePage;
