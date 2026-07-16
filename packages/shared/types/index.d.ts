export declare enum UserRole {
    ADMIN = "ADMIN",
    WAITER = "WAITER",
    CASHIER = "CASHIER",
    COOK = "COOK",
    HOSTESS = "HOSTESS"
}
export declare enum OrderStatus {
    PENDING = "PENDING",
    IN_KITCHEN = "IN_KITCHEN",
    READY = "READY",
    SERVED = "SERVED",
    PAID = "PAID",
    CANCELLED = "CANCELLED"
}
export declare enum OrderSource {
    WAITER = "WAITER",
    QR_TABLE = "QR_TABLE",
    WEB_FORM = "WEB_FORM",
    CUSTOMER_APP = "CUSTOMER_APP"
}
export declare enum OrderItemStatus {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    DONE = "DONE",
    CANCELLED = "CANCELLED"
}
export declare enum TableStatus {
    FREE = "FREE",
    OCCUPIED = "OCCUPIED",
    WAITING_PAYMENT = "WAITING_PAYMENT",
    RESERVED = "RESERVED"
}
export declare enum PaymentMethod {
    CASH = "CASH",
    CARD = "CARD",
    QR = "QR",
    LOYALTY = "LOYALTY",
    MIXED = "MIXED"
}
export declare enum PurchaseRequestStatus {
    DRAFT = "DRAFT",
    PENDING_APPROVAL = "PENDING_APPROVAL",
    SENT = "SENT",
    QUOTED = "QUOTED",
    CONFIRMED = "CONFIRMED",
    DELIVERED = "DELIVERED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED"
}
export declare enum LoyaltyTier {
    BRONZE = "BRONZE",
    SILVER = "SILVER",
    GOLD = "GOLD"
}
export declare const WsEvents: {
    readonly ORDER_NEW: "order:new";
    readonly ORDER_ITEM_STATUS: "order:item:status";
    readonly ORDER_CANCELLED: "order:cancelled";
    readonly ORDER_READY: "order:ready";
    readonly DISH_UNAVAILABLE: "dish:unavailable";
    readonly STOCK_ALERT: "stock:alert";
    readonly SHIFT_DISCREPANCY: "shift:discrepancy";
    readonly PROCUREMENT_READY: "procurement:ready";
    readonly JOIN_CAFE: "join:cafe";
    readonly JOIN_KITCHEN: "join:kitchen";
};
export interface JwtPayload {
    sub: string;
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
    portions: number;
}
