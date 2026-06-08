// Authentication Helper Functions
// This file handles all authentication-related functionality

// Check if user is authenticated
function isAuthenticated() {
  const token = localStorage.getItem("token");
  if (!token) return false;

  // Check if token is expired
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp;
    if (exp && Date.now() >= exp * 1000) {
      // Token expired
      logout();
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Get current user from token
function getCurrentUserFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      full_name: payload.full_name,
      role: payload.role,
    };
  } catch (e) {
    return null;
  }
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!isAuthenticated()) {
    const currentPath = window.location.pathname;
    if (currentPath !== "/login.html" && currentPath !== "/") {
      localStorage.setItem("redirectAfterLogin", currentPath);
    }
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// Redirect to dashboard if already logged in
function requireGuest() {
  if (isAuthenticated()) {
    window.location.href = "dashboard.html";
    return false;
  }
  return true;
}

// Logout function
async function logout() {
  try {
    // Call logout API to blacklist token (optional)
    const token = localStorage.getItem("token");
    if (token) {
      await apiCall("/auth/logout", { method: "POST" });
    }
  } catch (error) {
    console.error("Logout API error:", error);
  } finally {
    // Clear local storage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");
    localStorage.removeItem("redirectAfterLogin");

    // Redirect to login
    window.location.href = "login.html";
  }
}

// Check user permissions
function hasPermission(permissionCode) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = user.permissions || [];

  // Super admin has all permissions
  if (user.is_superuser) return true;

  return permissions.includes(permissionCode);
}

// Check user role
function hasRole(roleName) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const roles = user.roles || [];

  if (user.is_superuser) return true;

  return roles.includes(roleName);
}

// Get user's location scope
function getUserLocationScope() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return {
    location_id: user.location_id,
    location_code: user.location_code,
    scope_type: user.scope_type, // 'all_india', 'district', 'branch', 'department'
  };
}

// Refresh token (to be called periodically)
async function refreshToken() {
  try {
    const response = await apiCall("/auth/refresh", { method: "POST" });
    if (response.access_token) {
      localStorage.setItem("token", response.access_token);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Token refresh failed:", error);
    logout();
    return false;
  }
}

// Auto-refresh token every 25 minutes (since token expires in 30)
let refreshInterval = null;

function startTokenRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(
    () => {
      if (isAuthenticated()) {
        refreshToken();
      }
    },
    25 * 60 * 1000,
  ); // 25 minutes
}

function stopTokenRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// Load user details from API and store in localStorage
async function loadUserDetails() {
  try {
    const user = await api.getCurrentUser();
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    }
    return null;
  } catch (error) {
    console.error("Failed to load user details:", error);
    return null;
  }
}

// Handle login response
async function handleLoginResponse(response, rememberMe = false) {
  if (response.access_token) {
    localStorage.setItem("token", response.access_token);
    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
    }

    // Load user details
    await loadUserDetails();

    // Start token refresh
    startTokenRefresh();

    // Redirect to intended page or dashboard
    const redirectPath =
      localStorage.getItem("redirectAfterLogin") || "dashboard.html";
    localStorage.removeItem("redirectAfterLogin");

    return true;
  }
  return false;
}

// Check if user has access to a specific location
function hasLocationAccess(locationId) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userLocationId = user.location_id;
  const scopeType = user.scope_type;

  if (user.is_superuser) return true;
  if (scopeType === "all_india") return true;
  if (scopeType === "branch" && userLocationId === locationId) return true;

  // For district level, you would check if location belongs to user's district
  // This requires additional logic based on your location hierarchy

  return false;
}

// Get user's accessible locations (for dropdowns, filters, etc.)
async function getUserAccessibleLocations() {
  try {
    const allLocations = await api.getLocations();
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (user.is_superuser || user.scope_type === "all_india") {
      return allLocations;
    }

    if (user.scope_type === "branch") {
      return allLocations.filter((loc) => loc.id === user.location_id);
    }

    // For district level, filter by district
    if (user.scope_type === "district") {
      return allLocations.filter((loc) => loc.district === user.district);
    }

    return [];
  } catch (error) {
    console.error("Failed to get accessible locations:", error);
    return [];
  }
}

// Setup beforeunload event to cleanup
window.addEventListener("beforeunload", () => {
  if (!isAuthenticated()) {
    stopTokenRefresh();
  }
});

// Check authentication on page load
document.addEventListener("DOMContentLoaded", () => {
  // Start token refresh if authenticated
  if (isAuthenticated()) {
    startTokenRefresh();

    // Verify token with server periodically
    setInterval(
      async () => {
        if (isAuthenticated()) {
          try {
            await api.getCurrentUser();
          } catch (error) {
            if (error.message?.includes("401") || error.status === 401) {
              logout();
            }
          }
        }
      },
      5 * 60 * 1000,
    ); // Check every 5 minutes
  }
});

// Login function with error handling
async function login(username, password, rememberMe = false) {
  try {
    const response = await api.login(username, password);
    await handleLoginResponse(response, rememberMe);
    return { success: true };
  } catch (error) {
    let errorMessage = "Login failed";

    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Register function
async function register(userData) {
  try {
    const response = await api.register(userData);
    return { success: true, data: response };
  } catch (error) {
    let errorMessage = "Registration failed";

    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Forgot password request
async function forgotPassword(email) {
  try {
    await api.forgotPassword(email);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || "Failed to send reset email",
    };
  }
}

// Reset password
async function resetPassword(token, newPassword) {
  try {
    await api.resetPassword(token, newPassword);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || "Failed to reset password",
    };
  }
}

// Export functions for global use
window.auth = {
  isAuthenticated,
  getCurrentUserFromToken,
  requireAuth,
  requireGuest,
  logout,
  hasPermission,
  hasRole,
  getUserLocationScope,
  loadUserDetails,
  hasLocationAccess,
  getUserAccessibleLocations,
  login,
  register,
  forgotPassword,
  resetPassword,
};

// Also make individual functions available globally
window.isAuthenticated = isAuthenticated;
window.requireAuth = requireAuth;
window.requireGuest = requireGuest;
window.logout = logout;
window.hasPermission = hasPermission;
window.hasRole = hasRole;
window.login = login;
window.register = register;
