// User Roles for ERP/Marketplace
export const USER_ROLES = {
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
  AFFILIATE: "AFFILIATE",
  DELIVERY: "DELIVERY",
  SUPPLIER: "SUPPLIER",
  STAFF: "STAFF",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Order Status
export const ORDER_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// Transaction Types (for WalletTransaction)
export const TRANSACTION_TYPE = {
  ORDER_PAYMENT: "ORDER_PAYMENT",
  ORDER_REFUND: "ORDER_REFUND",
  COMMISSION: "COMMISSION",
  WITHDRAWAL: "WITHDRAWAL",
  DEPOSIT: "DEPOSIT",
  ADJUSTMENT: "ADJUSTMENT",
  PURCHASE_ORDERS: "PURCHASE_ORDERS",
} as const;

export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

// Commission Status (for backward compatibility)
export const COMMISSION_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
} as const;

export type CommissionStatus = (typeof COMMISSION_STATUS)[keyof typeof COMMISSION_STATUS];