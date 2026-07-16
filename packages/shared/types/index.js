"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsEvents = exports.LoyaltyTier = exports.PurchaseRequestStatus = exports.PaymentMethod = exports.TableStatus = exports.OrderItemStatus = exports.OrderSource = exports.OrderStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["WAITER"] = "WAITER";
    UserRole["CASHIER"] = "CASHIER";
    UserRole["COOK"] = "COOK";
    UserRole["HOSTESS"] = "HOSTESS";
})(UserRole || (exports.UserRole = UserRole = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["IN_KITCHEN"] = "IN_KITCHEN";
    OrderStatus["READY"] = "READY";
    OrderStatus["SERVED"] = "SERVED";
    OrderStatus["PAID"] = "PAID";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var OrderSource;
(function (OrderSource) {
    OrderSource["WAITER"] = "WAITER";
    OrderSource["QR_TABLE"] = "QR_TABLE";
    OrderSource["WEB_FORM"] = "WEB_FORM";
    OrderSource["CUSTOMER_APP"] = "CUSTOMER_APP";
})(OrderSource || (exports.OrderSource = OrderSource = {}));
var OrderItemStatus;
(function (OrderItemStatus) {
    OrderItemStatus["PENDING"] = "PENDING";
    OrderItemStatus["IN_PROGRESS"] = "IN_PROGRESS";
    OrderItemStatus["DONE"] = "DONE";
    OrderItemStatus["CANCELLED"] = "CANCELLED";
})(OrderItemStatus || (exports.OrderItemStatus = OrderItemStatus = {}));
var TableStatus;
(function (TableStatus) {
    TableStatus["FREE"] = "FREE";
    TableStatus["OCCUPIED"] = "OCCUPIED";
    TableStatus["WAITING_PAYMENT"] = "WAITING_PAYMENT";
    TableStatus["RESERVED"] = "RESERVED";
})(TableStatus || (exports.TableStatus = TableStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["QR"] = "QR";
    PaymentMethod["LOYALTY"] = "LOYALTY";
    PaymentMethod["MIXED"] = "MIXED";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PurchaseRequestStatus;
(function (PurchaseRequestStatus) {
    PurchaseRequestStatus["DRAFT"] = "DRAFT";
    PurchaseRequestStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    PurchaseRequestStatus["SENT"] = "SENT";
    PurchaseRequestStatus["QUOTED"] = "QUOTED";
    PurchaseRequestStatus["CONFIRMED"] = "CONFIRMED";
    PurchaseRequestStatus["DELIVERED"] = "DELIVERED";
    PurchaseRequestStatus["REJECTED"] = "REJECTED";
    PurchaseRequestStatus["CANCELLED"] = "CANCELLED";
})(PurchaseRequestStatus || (exports.PurchaseRequestStatus = PurchaseRequestStatus = {}));
var LoyaltyTier;
(function (LoyaltyTier) {
    LoyaltyTier["BRONZE"] = "BRONZE";
    LoyaltyTier["SILVER"] = "SILVER";
    LoyaltyTier["GOLD"] = "GOLD";
})(LoyaltyTier || (exports.LoyaltyTier = LoyaltyTier = {}));
exports.WsEvents = {
    ORDER_NEW: 'order:new',
    ORDER_ITEM_STATUS: 'order:item:status',
    ORDER_CANCELLED: 'order:cancelled',
    ORDER_READY: 'order:ready',
    DISH_UNAVAILABLE: 'dish:unavailable',
    STOCK_ALERT: 'stock:alert',
    SHIFT_DISCREPANCY: 'shift:discrepancy',
    PROCUREMENT_READY: 'procurement:ready',
    JOIN_CAFE: 'join:cafe',
    JOIN_KITCHEN: 'join:kitchen',
};
//# sourceMappingURL=index.js.map