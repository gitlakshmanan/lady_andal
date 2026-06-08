// Check authentication and admin permissions
if (!localStorage.getItem("token")) {
  window.location.href = "login.html";
}

let selectedRoleId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
  loadUsers();
  loadRoles();
  loadLocations();
  loadDepartments();
  loadCategories();
  setupEventListeners();
});

function setupEventListeners() {
  // Profile form
  document
    .getElementById("profileForm")
    ?.addEventListener("submit", updateProfile);
  document
    .getElementById("passwordForm")
    ?.addEventListener("submit", changePassword);

  // User management
  document.getElementById("saveUserBtn")?.addEventListener("click", saveUser);

  // Role management
  document
    .getElementById("savePermissionsBtn")
    ?.addEventListener("click", savePermissions);

  // Location management
  document
    .getElementById("saveLocationBtn")
    ?.addEventListener("click", saveLocation);

  // Department management
  document
    .getElementById("saveDepartmentBtn")
    ?.addEventListener("click", saveDepartment);

  // Category management
  document
    .getElementById("saveCategoryBtn")
    ?.addEventListener("click", saveCategory);

  // System settings
  document
    .getElementById("generalSettingsForm")
    ?.addEventListener("submit", saveGeneralSettings);
  document
    .getElementById("backupDataBtn")
    ?.addEventListener("click", backupDatabase);
  document
    .getElementById("clearCacheBtn")
    ?.addEventListener("click", clearCache);
}

// ============ Profile Settings ============
async function loadUserProfile() {
  try {
    const user = await api.getCurrentUser();
    if (user) {
      document.getElementById("profileName").textContent =
        user.full_name || user.username;
      document.getElementById("profileRole").textContent =
        user.role_name || "User";
      document.getElementById("fullName").value = user.full_name || "";
      document.getElementById("email").value = user.email || "";
      document.getElementById("username").value = user.username || "";

      // Load locations and departments for dropdowns
      const locations = await api.getLocations();
      const locationSelect = document.getElementById("userLocation");
      if (locationSelect && locations) {
        locationSelect.innerHTML =
          '<option value="">Select Location</option>' +
          locations
            .map(
              (l) =>
                `<option value="${l.id}" ${user.location_id === l.id ? "selected" : ""}>${l.name}</option>`,
            )
            .join("");
      }

      const departments = await api.getDepartments();
      const deptSelect = document.getElementById("userDepartment");
      if (deptSelect && departments) {
        deptSelect.innerHTML =
          '<option value="">Select Department</option>' +
          departments
            .map(
              (d) =>
                `<option value="${d.id}" ${user.department_id === d.id ? "selected" : ""}>${d.name}</option>`,
            )
            .join("");
      }
    }
  } catch (error) {
    console.error("Failed to load user profile:", error);
    showToast("Failed to load profile", "error");
  }
}

async function updateProfile(e) {
  e.preventDefault();

  const profileData = {
    full_name: document.getElementById("fullName").value,
    email: document.getElementById("email").value,
    location_id: document.getElementById("userLocation").value || null,
    department_id: document.getElementById("userDepartment").value || null,
  };

  try {
    await api.updateProfile(profileData);
    showToast("Profile updated successfully!", "success");
    loadUserProfile(); // Reload to show changes
  } catch (error) {
    showToast(error.message || "Failed to update profile", "error");
  }
}

async function changePassword(e) {
  e.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (newPassword !== confirmPassword) {
    showToast("New passwords do not match", "error");
    return;
  }

  if (newPassword.length < 6) {
    showToast("Password must be at least 6 characters", "error");
    return;
  }

  try {
    await api.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });

    showToast("Password changed successfully!", "success");
    document.getElementById("passwordForm").reset();
  } catch (error) {
    showToast(error.message || "Failed to change password", "error");
  }
}

// ============ User Management ============
async function loadUsers() {
  try {
    const users = await api.getUsers();
    displayUsers(users);

    // Load role and location selects for user modal
    const roles = await api.getRoles();
    const roleSelect = document.getElementById("userRole");
    if (roleSelect && roles) {
      roleSelect.innerHTML =
        '<option value="">Select Role</option>' +
        roles.map((r) => `<option value="${r.id}">${r.name}</option>`).join("");
    }

    const locations = await api.getLocations();
    const locationSelect = document.getElementById("userLocationSelect");
    if (locationSelect && locations) {
      locationSelect.innerHTML =
        '<option value="">Select Location</option>' +
        locations
          .map((l) => `<option value="${l.id}">${l.name}</option>`)
          .join("");
    }

    const departments = await api.getDepartments();
    const deptSelect = document.getElementById("userDepartmentSelect");
    if (deptSelect && departments) {
      deptSelect.innerHTML =
        '<option value="">Select Department</option>' +
        departments
          .map((d) => `<option value="${d.id}">${d.name}</option>`)
          .join("");
    }
  } catch (error) {
    console.error("Failed to load users:", error);
  }
}

function displayUsers(users) {
  const tbody = document.getElementById("usersBody");

  if (!users || users.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = users
    .map(
      (user) => `
        <tr>
            <td>${escapeHtml(user.username)}</td>
            <td>${escapeHtml(user.full_name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${escapeHtml(user.role_name || "User")}</td>
            <td>${escapeHtml(user.location_name || "-")}</td>
            <td>${user.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Inactive</span>'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editUser(${user.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteUser(${user.id})">
                    <i class="bi bi-trash"></i>
                </button>
             </td>
         </tr>
    `,
    )
    .join("");
}

async function saveUser() {
  const userData = {
    username: document.getElementById("userUsername").value,
    full_name: document.getElementById("userFullName").value,
    email: document.getElementById("userEmail").value,
    password: document.getElementById("userPassword").value || undefined,
    role_id: document.getElementById("userRole").value || null,
    location_id: document.getElementById("userLocationSelect").value || null,
    department_id:
      document.getElementById("userDepartmentSelect").value || null,
    is_active: document.getElementById("userActive").checked,
  };

  if (!userData.username || !userData.full_name || !userData.email) {
    showToast("Please fill all required fields", "error");
    return;
  }

  try {
    if (window.editingUserId) {
      await api.updateUser(window.editingUserId, userData);
      showToast("User updated successfully!", "success");
      window.editingUserId = null;
    } else {
      if (!userData.password) {
        showToast("Password is required for new users", "error");
        return;
      }
      await api.createUser(userData);
      showToast("User created successfully!", "success");
    }

    bootstrap.Modal.getInstance(document.getElementById("userModal")).hide();
    document.getElementById("userForm").reset();
    loadUsers();
  } catch (error) {
    showToast(error.message || "Failed to save user", "error");
  }
}

function editUser(userId) {
  window.editingUserId = userId;
  // Load user data and populate modal
  showToast("Edit user feature - Loading user data", "info");
  // Open modal
  const modal = new bootstrap.Modal(document.getElementById("userModal"));
  modal.show();
}

async function deleteUser(userId) {
  if (confirm("Are you sure you want to delete this user?")) {
    try {
      await api.deleteUser(userId);
      showToast("User deleted successfully", "success");
      loadUsers();
    } catch (error) {
      showToast(error.message || "Failed to delete user", "error");
    }
  }
}

// ============ Role Management ============
async function loadRoles() {
  try {
    const roles = await api.getRoles();
    displayRoles(roles);
  } catch (error) {
    console.error("Failed to load roles:", error);
  }
}

function displayRoles(roles) {
  const container = document.getElementById("rolesList");

  if (!roles || roles.length === 0) {
    container.innerHTML = '<div class="text-center">No roles found</div>';
    return;
  }

  container.innerHTML = roles
    .map(
      (role) => `
        <a href="#" class="list-group-item list-group-item-action" onclick="selectRole(${role.id}, '${role.name}')">
            <i class="bi bi-shield-lock"></i> ${escapeHtml(role.name)}
            <small class="text-muted d-block">${escapeHtml(role.description || "")}</small>
        </a>
    `,
    )
    .join("");
}

function selectRole(roleId, roleName) {
  selectedRoleId = roleId;
  document.getElementById("selectedRoleName").textContent = roleName;
  loadPermissionsForRole(roleId);
  document.getElementById("savePermissionsBtn").style.display = "block";
}

async function loadPermissionsForRole(roleId) {
  try {
    const permissions = await api.getPermissions();
    const rolePermissions = await api.getRolePermissions(roleId);

    const container = document.getElementById("permissionsList");
    const permissionGroups = groupPermissions(permissions);

    let html = "";
    for (const [module, perms] of Object.entries(permissionGroups)) {
      html += `
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-header">
                            <strong>${module}</strong>
                        </div>
                        <div class="card-body">
                            ${perms
                              .map(
                                (perm) => `
                                <div class="form-check">
                                    <input class="form-check-input permission-checkbox" type="checkbox"
                                        value="${perm.id}" id="perm_${perm.id}"
                                        ${rolePermissions.includes(perm.id) ? "checked" : ""}>
                                    <label class="form-check-label" for="perm_${perm.id}">
                                        ${perm.name}
                                    </label>
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    </div>
                </div>
            `;
    }

    container.innerHTML = html;
  } catch (error) {
    console.error("Failed to load permissions:", error);
  }
}

function groupPermissions(permissions) {
  const groups = {};
  permissions.forEach((perm) => {
    const module = perm.module || "General";
    if (!groups[module]) groups[module] = [];
    groups[module].push(perm);
  });
  return groups;
}

async function savePermissions() {
  if (!selectedRoleId) return;

  const selectedPermissions = [];
  document.querySelectorAll(".permission-checkbox:checked").forEach((cb) => {
    selectedPermissions.push(parseInt(cb.value));
  });

  try {
    await api.updateRolePermissions(selectedRoleId, selectedPermissions);
    showToast("Permissions saved successfully!", "success");
  } catch (error) {
    showToast(error.message || "Failed to save permissions", "error");
  }
}

// ============ Location Management ============
async function loadLocations() {
  try {
    const locations = await api.getLocations();
    displayLocations(locations);
  } catch (error) {
    console.error("Failed to load locations:", error);
  }
}

function displayLocations(locations) {
  const tbody = document.getElementById("locationsBody");

  if (!locations || locations.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">No locations found</td></tr>';
    return;
  }

  tbody.innerHTML = locations
    .map(
      (location) => `
        <tr>
            <td><code>${escapeHtml(location.code)}</code></td>
            <td>${escapeHtml(location.name)}</td>
            <td>${escapeHtml(location.type || "Branch")}</td>
            <td>${escapeHtml(location.address || "-")}</td>
            <td>${location.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Inactive</span>'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editLocation(${location.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteLocation(${location.id})">
                    <i class="bi bi-trash"></i>
                </button>
             </td>
         </tr>
    `,
    )
    .join("");
}

// ============ Department Management ============
async function loadDepartments() {
  try {
    const departments = await api.getDepartments();
    displayDepartments(departments);
  } catch (error) {
    console.error("Failed to load departments:", error);
  }
}

function displayDepartments(departments) {
  const tbody = document.getElementById("departmentsBody");

  if (!departments || departments.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">No departments found</td></tr>';
    return;
  }

  tbody.innerHTML = departments
    .map(
      (dept) => `
        <tr>
            <td><code>${escapeHtml(dept.code)}</code></td>
            <td>${escapeHtml(dept.name)}</td>
            <td>${escapeHtml(dept.description || "-")}</td>
            <td>${escapeHtml(dept.head_name || "-")}</td>
            <td>${dept.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Inactive</span>'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editDepartment(${dept.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteDepartment(${dept.id})">
                    <i class="bi bi-trash"></i>
                </button>
             </td>
         </tr>
    `,
    )
    .join("");
}

// ============ Category Management ============
async function loadCategories() {
  try {
    const categories = await api.getCategories();
    displayCategories(categories);
  } catch (error) {
    console.error("Failed to load categories:", error);
  }
}

function displayCategories(categories) {
  const tbody = document.getElementById("categoriesBody");

  if (!categories || categories.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center">No categories found</td></tr>';
    return;
  }

  tbody.innerHTML = categories
    .map(
      (cat) => `
        <tr>
            <td><code>${escapeHtml(cat.code)}</code></td>
            <td>${escapeHtml(cat.name)}</td>
            <td>${escapeHtml(cat.parent_name || "-")}</td>
            <td>${escapeHtml(cat.description || "-")}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editCategory(${cat.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteCategory(${cat.id})">
                    <i class="bi bi-trash"></i>
                </button>
             </td>
         </tr>
    `,
    )
    .join("");
}

// ============ System Settings ============
async function saveGeneralSettings(e) {
  e.preventDefault();

  const settings = {
    system_name: document.getElementById("systemName").value,
    company_logo: document.getElementById("companyLogo").value,
    default_language: document.getElementById("defaultLanguage").value,
    date_format: document.getElementById("dateFormat").value,
  };

  try {
    await api.updateSystemSettings(settings);
    showToast("Settings saved successfully!", "success");
  } catch (error) {
    showToast(error.message || "Failed to save settings", "error");
  }
}

async function backupDatabase() {
  try {
    showToast("Starting database backup...", "info");
    const response = await api.backupDatabase();
    // Trigger download
    const blob = new Blob([response.data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup completed successfully!", "success");
  } catch (error) {
    showToast("Backup failed: " + error.message, "error");
  }
}

async function clearCache() {
  if (confirm("This will clear all system cache. Are you sure?")) {
    try {
      await api.clearCache();
      showToast("Cache cleared successfully!", "success");
    } catch (error) {
      showToast("Failed to clear cache", "error");
    }
  }
}

// Utility functions
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
window.selectRole = selectRole;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.editLocation = editLocation;
window.deleteLocation = deleteLocation;
window.editDepartment = editDepartment;
window.deleteDepartment = deleteDepartment;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
