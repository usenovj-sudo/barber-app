export type OrderStatus = 'PENDING' | 'IN_KITCHEN' | 'READY' | 'SERVED' | 'PAID' | 'CANCELLED';
export type TableStatus = 'FREE' | 'OCCUPIED' | 'WAITING_PAYMENT' | 'RESERVED';

export interface ActiveOrderSummary {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
}

export interface PosTable {
  id: string;
  number: number;
  capacity: number;
  hallId: string | null;
  status: TableStatus;
  activeOrder: ActiveOrderSummary | null;
}

export interface PosHall {
  id: string;
  name: string;
  tables: PosTable[];
}

export interface MenuDish {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  availablePortions: number;
  category?: { id: string; name: string } | null;
}

export interface OrderItem {
  id: string;
  dishId: string;
  quantity: number;
  price: number;
  status: string;
  comment?: string | null;
  dish: { id: string; name: string };
}

export interface Order {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  note?: string | null;
  table?: { id: string; number: number } | null;
  items: OrderItem[];
}

export const TABLE_STATUS_RU: Record<TableStatus, string> = {
  FREE: 'Свободен',
  OCCUPIED: 'Занят',
  WAITING_PAYMENT: 'Ждёт оплаты',
  RESERVED: 'Бронь',
};

export const ORDER_STATUS_RU: Record<OrderStatus, string> = {
  PENDING: 'Черновик',
  IN_KITCHEN: 'На кухне',
  READY: 'Готов',
  SERVED: 'Подан',
  PAID: 'Оплачен',
  CANCELLED: 'Отменён',
};
