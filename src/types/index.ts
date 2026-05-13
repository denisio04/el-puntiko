import { USER_ROLES, ORDER_STATUS, TRANSACTION_TYPE, type UserRole, type OrderStatus, type TransactionType } from "@/lib/constants";

export { USER_ROLES, ORDER_STATUS, TRANSACTION_TYPE, type UserRole, type OrderStatus, type TransactionType };

// Product types
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  comparePrice?: number | null;
  image?: string | null;
  imageId?: string | null;
  stock: number;
  category?: string | null;
  isActive: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithItems extends Product {
  orderItems?: OrderItem[];
}

// Order types
export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string | null;
  subtotal: number;
  total: number;
  status: OrderStatus;
  affiliateId?: string | null;
  customerId?: string | null;
  staffId?: string | null;
  deliveryId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  affiliate?: AffiliateProfile | null;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  order?: Order;
  product?: Product;
}

// User types
export interface User {
  id: string;
  email?: string | null;
  username?: string | null;
  password: string;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  ci?: string | null;
  role: UserRole;
  wallet: number;
  createdAt: Date;
  updatedAt: Date;
  affiliateProfile?: AffiliateProfile | null;
}

// Affiliate types
export interface AffiliateProfile {
  id: string;
  userId: string;
  code: string;
  commissionRate: number;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  orders?: Order[];
}

// WalletTransaction types
export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  description?: string | null;
  orderId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  order?: Order;
}

// ProductRequest types
export type ProductRequestStatus = "PENDING" | "NOTIFIED" | "COMPLETED" | "CANCELLED";

export interface ProductRequest {
  id: string;
  productId: string;
  userId: string;
  status: ProductRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  product?: Product;
  user?: User;
}

// Session types (NextAuth)
export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  createdAt: Date;
}

export interface VerificationToken {
  identifier: string;
  token: string;
  expires: Date;
}

// Cart types
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}