import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number(),
  observation: z.string().optional().nullable(),
  addons: z.array(
    z.object({
      name: z.string(),
      price: z.number(),
    })
  ).optional(),
});

export const orderSchema = z.object({
  storeId: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  deliveryType: z.enum(["pickup", "delivery"]),
  paymentMethod: z.string(),

  deliveryStreet: z.string().optional(),
  deliveryNumber: z.string().optional(),
  deliveryNeighborhood: z.string().optional(),
  deliveryComplement: z.string().optional(),
  changeAmount: z.number().optional(),

  items: z.array(orderItemSchema),
});

export type CreateOrderData = z.infer<typeof orderSchema>;
