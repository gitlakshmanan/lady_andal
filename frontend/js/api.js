// API Configuration
const API_BASE_URL =
  window.location.protocol === "file:"
    ? "http://127.0.0.1:8000/api/v1"
    : `${window.location.origin}/api/v1`;

// Generic API call function
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: { ...defaultOptions.headers, ...options.headers },
    });

    // Handle unauthorized
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
      throw new Error("Session expired. Please login again.");
    }

    // Handle other errors
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    // Return JSON or text based on content-type
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    console.error("API Call Failed:", error);
    throw error;
  }
}

// ============ AUTHENTICATION APIs ============

async function login(username, password) {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Login failed");
  }

  return response.json();
}

async function getCurrentUser() {
  return apiCall("/auth/me");
}

async function logout() {
  return apiCall("/auth/logout", { method: "POST" });
}

// ============ INVENTORY APIs ============

async function getCurrentStock(filters = {}) {
  const params = new URLSearchParams(filters);
  return apiCall(`/inventory/current-stock?${params}`);
}

async function getStockLedger(productId, filters = {}) {
  const params = new URLSearchParams(filters);
  return apiCall(`/inventory/ledger/${productId}?${params}`);
}

async function getProducts() {
  return apiCall("/inventory/products");
}

async function createProduct(productData) {
  return apiCall("/inventory/products", {
    method: "POST",
    body: JSON.stringify(productData),
  });
}

async function createStockEntry(entryData) {
  return apiCall("/inventory/stock-entry", {
    method: "POST",
    body: JSON.stringify(entryData),
  });
}

async function getCategories() {
  return apiCall("/inventory/categories");
}

// ============ DEMAND APIs ============

async function createDemand(demandData) {
  return apiCall("/demands/", {
    method: "POST",
    body: JSON.stringify(demandData),
  });
}

async function getDemands(filters = {}) {
  const params = new URLSearchParams(filters);
  return apiCall(`/demands/?${params}`);
}

async function getDemandById(demandId) {
  return apiCall(`/demands/${demandId}`);
}

async function submitDemand(demandId) {
  return apiCall(`/demands/${demandId}/submit`, { method: "PUT" });
}

async function approveDemand(demandId, remarks = "") {
  return apiCall(
    `/demands/${demandId}/approve?remarks=${encodeURIComponent(remarks)}`,
    {
      method: "PUT",
    },
  );
}

async function rejectDemand(demandId, remarks = "") {
  return apiCall(
    `/demands/${demandId}/reject?remarks=${encodeURIComponent(remarks)}`,
    {
      method: "PUT",
    },
  );
}

async function getPendingApprovals() {
  return apiCall("/demands/pending-approvals");
}

// ============ TRANSFER APIs ============

async function createTransfer(transferData) {
  return apiCall("/transfers/", {
    method: "POST",
    body: JSON.stringify(transferData),
  });
}

async function getTransfers(filters = {}) {
  const params = new URLSearchParams(filters);
  return apiCall(`/transfers/?${params}`);
}

async function approveTransfer(transferId, remarks = "") {
  return apiCall(
    `/transfers/${transferId}/approve?remarks=${encodeURIComponent(remarks)}`,
    {
      method: "PUT",
    },
  );
}

// ============ REPORT APIs ============

async function getStockReport(filters = {}) {
  const params = new URLSearchParams(filters);
  return apiCall(`/reports/stock?${params}`);
}

async function getDemandReport(filters = {}) {
  const params = new URLSearchParams(filters);
  return apiCall(`/reports/demand?${params}`);
}

async function getAuditReport(filters = {}) {
  const params = new URLSearchParams(filters);
  return apiCall(`/reports/audit?${params}`);
}

// ============ DASHBOARD APIs ============

async function getDashboardStats() {
  return apiCall("/dashboard/stats");
}

// Export all APIs
window.api = {
  // Auth
  login,
  getCurrentUser,
  logout,

  // Inventory
  getCurrentStock,
  getStockLedger,
  getProducts,
  createProduct,
  createStockEntry,
  getCategories,

  // Demands
  createDemand,
  getDemands,
  getDemandById,
  submitDemand,
  approveDemand,
  rejectDemand,
  getPendingApprovals,

  // Transfers
  createTransfer,
  getTransfers,
  approveTransfer,

  // Reports
  getStockReport,
  getDemandReport,
  getAuditReport,

  // Dashboard
  getDashboardStats,
};

// Add these functions to your existing api.js file

// ============ ADDITIONAL AUTHENTICATION APIs ============

async function register(userData) {
  return apiCall("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

async function forgotPassword(email) {
  return apiCall("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

async function resetPassword(token, newPassword) {
  return apiCall("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

async function refreshToken() {
  return apiCall("/auth/refresh", {
    method: "POST",
  });
}

// ============ USER MANAGEMENT APIs ============

async function getUsers() {
  return apiCall("/users/");
}

async function getUserById(userId) {
  return apiCall(`/users/${userId}`);
}

async function createUser(userData) {
  return apiCall("/users/", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

async function updateUser(userId, userData) {
  return apiCall(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(userData),
  });
}

async function deleteUser(userId) {
  return apiCall(`/users/${userId}`, {
    method: "DELETE",
  });
}

async function updateProfile(profileData) {
  return apiCall("/users/profile", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
}

async function changePassword(passwordData) {
  return apiCall("/users/change-password", {
    method: "POST",
    body: JSON.stringify(passwordData),
  });
}

// ============ ROLE & PERMISSION APIs ============

async function getRoles() {
  return apiCall("/roles/");
}

async function getPermissions() {
  return apiCall("/permissions/");
}

async function getRolePermissions(roleId) {
  return apiCall(`/roles/${roleId}/permissions`);
}

async function updateRolePermissions(roleId, permissionIds) {
  return apiCall(`/roles/${roleId}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permission_ids: permissionIds }),
  });
}

// ============ LOCATION APIs ============

async function getLocations() {
  return apiCall("/locations/");
}

async function createLocation(locationData) {
  return apiCall("/locations/", {
    method: "POST",
    body: JSON.stringify(locationData),
  });
}

async function updateLocation(locationId, locationData) {
  return apiCall(`/locations/${locationId}`, {
    method: "PUT",
    body: JSON.stringify(locationData),
  });
}

async function deleteLocation(locationId) {
  return apiCall(`/locations/${locationId}`, {
    method: "DELETE",
  });
}

// ============ DEPARTMENT APIs ============

async function getDepartments() {
  return apiCall("/departments/");
}

async function createDepartment(departmentData) {
  return apiCall("/departments/", {
    method: "POST",
    body: JSON.stringify(departmentData),
  });
}

async function updateDepartment(departmentId, departmentData) {
  return apiCall(`/departments/${departmentId}`, {
    method: "PUT",
    body: JSON.stringify(departmentData),
  });
}

async function deleteDepartment(departmentId) {
  return apiCall(`/departments/${departmentId}`, {
    method: "DELETE",
  });
}

// ============ AUDIT APIs ============

async function getAuditLogs(filters = {}) {
  const params = new URLSearchParams(filters);
  return apiCall(`/audit/logs?${params}`);
}

async function getAuditLogById(logId) {
  return apiCall(`/audit/logs/${logId}`);
}

async function getAuditSummary() {
  return apiCall("/audit/summary");
}

// ============ SYSTEM APIs ============

async function updateSystemSettings(settings) {
  return apiCall("/system/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

async function backupDatabase() {
  return apiCall("/system/backup", {
    method: "POST",
  });
}

async function clearCache() {
  return apiCall("/system/clear-cache", {
    method: "POST",
  });
}

// Add these to your window.api export
window.api = {
  // Auth
  login,
  getCurrentUser,
  logout,

  // Auth
  register,
  forgotPassword,
  resetPassword,
  refreshToken,

  // Inventory
  getCurrentStock,
  getStockLedger,
  getProducts,
  createProduct,
  createStockEntry,
  getCategories,

  // Demands
  createDemand,
  getDemands,
  getDemandById,
  submitDemand,
  approveDemand,
  rejectDemand,
  getPendingApprovals,

  // Transfers
  createTransfer,
  getTransfers,
  approveTransfer,

  // Reports
  getStockReport,
  getDemandReport,
  getAuditReport,

  // Dashboard
  getDashboardStats,

  // Users
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateProfile,
  changePassword,

  // Roles & Permissions
  getRoles,
  getPermissions,
  getRolePermissions,
  updateRolePermissions,

  // Locations
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,

  // Departments
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,

  // Audit
  getAuditLogs,
  getAuditLogById,
  getAuditSummary,

  // System
  updateSystemSettings,
  backupDatabase,
  clearCache,
};
