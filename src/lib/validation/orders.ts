import { z } from "zod";

import { AuthorizationError } from "@/lib/auth/verify-request";
import type { Product } from "@/types/catalog";
import type { CreateOrderInput, OrderCustomization, OrderItem, OrderStatus } from "@/types/orders";

export class OrderValidationError extends Error {
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

const customizationSchema = z.object({
  size: z.enum(["Small", "Medium", "Large"]),
  flavors: z.array(z.string().trim().min(1)).max(20),
  addOns: z.array(z.string().trim().min(1)).max(20),
});

export const createOrderInputSchema = z.object({
  customerName: z.string().trim().min(2, "El nombre es obligatorio").max(120),
  phone: z.string().trim().min(7, "El telefono es obligatorio").max(30).regex(/^[+\d()\s-]+$/, "El telefono no es valido"),
  address: z.string().trim().min(5, "La direccion es obligatoria").max(240),
  notes: z.string().trim().max(500).optional(),
  items: z.array(z.object({
    productId: z.string().trim().min(1),
    quantity: z.number().int().min(1).max(50),
    customization: customizationSchema,
  })).min(1, "El carrito no puede estar vacio").max(50),
  promotionCode: z.string().trim().min(1).max(40).optional(),
}).superRefine((input, context) => {
  if (input.promotionCode) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["promotionCode"], message: "La promocion no es valida" });
  }
});

export const statusUpdateSchema = z.object({
  status: z.enum(["pendiente", "confirmado", "preparando", "en_camino", "entregado", "cancelado"]),
  reason: z.string().trim().max(240).optional(),
});

const sizeMultipliers: Record<OrderCustomization["size"], number> = {
  Small: 0.8,
  Medium: 1,
  Large: 1.3,
};

export const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pendiente: ["confirmado", "cancelado"],
  confirmado: ["preparando", "cancelado"],
  preparando: ["en_camino", "cancelado"],
  en_camino: ["entregado", "cancelado"],
  entregado: [],
  cancelado: [],
};

export function assertValidTransition(current: OrderStatus, next: OrderStatus): void {
  if (!allowedTransitions[current] || !allowedTransitions[current].includes(next)) {
    throw new OrderValidationError(`Transicion no permitida: ${current} -> ${next}`);
  }
}

export function assertOrderOwnership(user: { uid: string }, clienteUid: string): void {
  if (user.uid !== clienteUid) {
    throw new AuthorizationError(403, "No tienes permiso para acceder a este pedido");
  }
}

type CalculatedOrder = {
  items: OrderItem[];
  subtotal: number;
  total: number;
};

function assertDistinct(values: string[], message: string): void {
  if (new Set(values).size !== values.length) throw new OrderValidationError(message);
}

export function calculateOrder(input: CreateOrderInput, products: Product[]): CalculatedOrder {
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  for (const [productId, quantity] of quantities) {
    const product = products.find((candidate) => candidate.id === productId);
    if (product && quantity > product.stock) throw new OrderValidationError("La cantidad supera el stock disponible");
  }

  const items = input.items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) throw new OrderValidationError("Producto no encontrado");
    if (!product.active) throw new OrderValidationError("El producto no esta activo");

    const { flavors, addOns } = item.customization;
    assertDistinct(flavors, "No se pueden repetir sabores");
    assertDistinct(addOns, "No se pueden repetir adiciones");
    if (flavors.some((flavor) => !product.availableFlavors.includes(flavor))) {
      throw new OrderValidationError("El sabor no esta disponible");
    }

    const selectedAddOns = addOns.map((name) => {
      const addOn = product.availableAddOns.find((candidate) => candidate.name === name);
      if (!addOn) throw new OrderValidationError("La adicion no esta disponible");
      return addOn;
    });
    const unitPrice = Math.round(product.price * sizeMultipliers[item.customization.size] + selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0));

    return {
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice,
      subtotal: unitPrice * item.quantity,
      customization: item.customization,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { items, subtotal, total: subtotal };
}
