export const ORDER_STATUSES = [
  "pendiente",
  "confirmado",
  "preparando",
  "en_camino",
  "entregado",
  "cancelado",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderCustomization = {
  size: "Small" | "Medium" | "Large";
  flavors: string[];
  addOns: string[];
};

export type CheckoutItemInput = {
  productId: string;
  quantity: number;
  customization: OrderCustomization;
};

export type CreateOrderInput = {
  customerName: string;
  phone: string;
  address: string;
  notes?: string;
  items: CheckoutItemInput[];
  promotionCode?: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  customization: OrderCustomization;
};

export type StatusUpdate = {
  status: OrderStatus;
  reason?: string;
};

export type OrderAudit = {
  createdByUid: string;
  createdAt: string;
  updatedByUid?: string;
  updatedAt?: string;
};

export type Order = {
  id: string;
  clienteUid: string;
  customerName: string;
  phone: string;
  address: string;
  notes?: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  audit: OrderAudit;
  promotionCode?: string;
};
