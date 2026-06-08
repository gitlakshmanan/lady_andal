from enum import Enum


class PermissionCode(str, Enum):
    # Demand permissions
    CREATE_DEMAND = "CREATE_DEMAND"
    EDIT_DEMAND = "EDIT_DEMAND"
    DELETE_DEMAND = "DELETE_DEMAND"
    APPROVE_DEMAND = "APPROVE_DEMAND"
    REJECT_DEMAND = "REJECT_DEMAND"
    VIEW_ALL_DEMANDS = "VIEW_ALL_DEMANDS"

    # Inventory permissions
    CREATE_STOCK_ENTRY = "CREATE_STOCK_ENTRY"
    ADJUST_STOCK = "ADJUST_STOCK"
    VIEW_STOCK = "VIEW_STOCK"
    VIEW_GLOBAL_STOCK = "VIEW_GLOBAL_STOCK"
    MANAGE_PRODUCTS = "MANAGE_PRODUCTS"

    # Transfer permissions
    CREATE_TRANSFER = "CREATE_TRANSFER"
    APPROVE_TRANSFER = "APPROVE_TRANSFER"
    RECEIVE_TRANSFER = "RECEIVE_TRANSFER"

    # User management
    MANAGE_USERS = "MANAGE_USERS"
    MANAGE_ROLES = "MANAGE_ROLES"
    VIEW_AUDIT = "VIEW_AUDIT"

    # Reporting
    GENERATE_REPORTS = "GENERATE_REPORTS"
    EXPORT_DATA = "EXPORT_DATA"

    # System
    MANAGE_SYSTEM = "MANAGE_SYSTEM"
    REVERSE_TRANSACTION = "REVERSE_TRANSACTION"


ROLE_PERMISSIONS = {
    "Super User": [
        PermissionCode.CREATE_DEMAND,
        PermissionCode.APPROVE_DEMAND,
        PermissionCode.VIEW_ALL_DEMANDS,
        PermissionCode.CREATE_STOCK_ENTRY,
        PermissionCode.ADJUST_STOCK,
        PermissionCode.VIEW_GLOBAL_STOCK,
        PermissionCode.MANAGE_PRODUCTS,
        PermissionCode.CREATE_TRANSFER,
        PermissionCode.APPROVE_TRANSFER,
        PermissionCode.MANAGE_USERS,
        PermissionCode.MANAGE_ROLES,
        PermissionCode.VIEW_AUDIT,
        PermissionCode.GENERATE_REPORTS,
        PermissionCode.EXPORT_DATA,
        PermissionCode.MANAGE_SYSTEM,
        PermissionCode.REVERSE_TRANSACTION,
    ],
    "Regional Admin": [
        PermissionCode.CREATE_DEMAND,
        PermissionCode.APPROVE_DEMAND,
        PermissionCode.VIEW_ALL_DEMANDS,
        PermissionCode.CREATE_STOCK_ENTRY,
        PermissionCode.VIEW_STOCK,
        PermissionCode.CREATE_TRANSFER,
        PermissionCode.APPROVE_TRANSFER,
        PermissionCode.MANAGE_USERS,
        PermissionCode.GENERATE_REPORTS,
    ],
    "Branch Admin": [
        PermissionCode.CREATE_DEMAND,
        PermissionCode.VIEW_STOCK,
        PermissionCode.CREATE_STOCK_ENTRY,
        PermissionCode.CREATE_TRANSFER,
        PermissionCode.GENERATE_REPORTS,
    ],
    "Staff": [PermissionCode.CREATE_DEMAND, PermissionCode.VIEW_STOCK],
}
