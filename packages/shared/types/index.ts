// Shared TypeScript types used across all packages

export enum UserRole {
  ADMIN = 'ADMIN',
  WAITER = 'WAITER',
  CASHIER = 'CASHIER',
  COOK = 'COOK',
  HOSTESS = 'HOSTESS',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  IN_KITCHEN = 'IN_KITCHEN',
  READY = 'READY',
  SERVED = 'SERVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum OrderSource {
  WAITER = 'WAITER',
  QR_TABLE = 'QR_TABLE',
  WEB_FORM = 'WEB_FORM',
  CUSTOMER_APP = 'CUSTOMER_APP',
}

export enum OrderItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum TableStatus {
  FREE = 'FREE',
  OCCUPIED = 'OCCUPIED',
  WAITING_PAYMENT = 'WAITING_PAYMENT',
  RESERVED = 'RESERVED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  QR = 'QR',
  LOYALTY = 'LOYALTY',
  MIXED = 'MIXED',
}

export enum PurchaseRequestStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  SENT = 'SENT',
  QUOTED = 'QUOTED',
  CONFIRMED = 'CONFIRMED',
  DELIVERED = 'DELIVERED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
}

// WebSocket event names (single source of truth for all clients)
export const WsEvents = {
  // Server → Kitchen display
  ORDER_NEW: 'order:new',
  ORDER_ITEM_STATUS: 'order:item:status',
  ORDER_CANCELLED: 'order:cancelled',
  // Server → Waiter app
  ORDER_READY: 'order:ready',
  DISH_UNAVAILABLE: 'dish:unavailable',
  // Server → Admin
  STOCK_ALERT: 'stock:alert',
  SHIFT_DISCREPANCY: 'shift:discrepancy',
  PROCUREMENT_READY: 'procurement:ready',
  // Client → Server
  JOIN_CAFE: 'join:cafe',
  JOIN_KITCHEN: 'join:kitchen',
} as const;

export interface JwtPayload {
  sub: string;       // user id
  cafeId: string;
  role: UserRole;
  email: string;
}

export interface StockAlert {
  ingredientId: string;
  name: string;
  unit: string;
  stockQty: number;
  minStockLevel: number;
}

export interface AvailablePortions {
  dishId: string;
  portions: number; // how many full portions can still be made
}
