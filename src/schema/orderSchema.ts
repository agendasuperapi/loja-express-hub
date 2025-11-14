import { z } from "zod";

// Order item addon validation with length constraints
const orderItemAddonSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Addon name cannot be empty")
    .max(100, "Addon name must be less than 100 characters"),
  price: z.number()
    .min(0, "Price must be non-negative"),
});

// Order item validation with length constraints
export const orderItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  productName: z.string()
    .trim()
    .min(1, "Product name cannot be empty")
    .max(200, "Product name must be less than 200 characters"),
  quantity: z.number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(100, "Quantity cannot exceed 100"),
  unitPrice: z.number()
    .min(0, "Price must be non-negative"),
  observation: z.string()
    .trim()
    .max(500, "Observation must be less than 500 characters")
    .optional()
    .nullable()
    .transform(val => val || null),
  addons: z.array(orderItemAddonSchema)
    .max(20, "Cannot have more than 20 addons per item")
    .optional(),
});

// Main order validation schema with comprehensive length constraints
export const orderSchema = z.object({
  storeId: z.string().uuid("Invalid store ID"),
  customerName: z.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Name contains invalid characters"),
  customerPhone: z.string()
    .trim()
    .min(10, "Phone number must have at least 10 digits")
    .max(15, "Phone number must be less than 15 digits")
    .transform(val => val.replace(/\D/g, ''))
    .refine(val => val.length >= 10 && val.length <= 15, {
      message: "Phone number must be between 10 and 15 digits after formatting"
    }),
  deliveryType: z.enum(["pickup", "delivery"], {
    errorMap: () => ({ message: "Delivery type must be either 'pickup' or 'delivery'" })
  }),
  paymentMethod: z.string()
    .trim()
    .min(1, "Payment method is required")
    .max(50, "Payment method must be less than 50 characters"),

  // Delivery address fields with validation
  deliveryStreet: z.string()
    .trim()
    .max(200, "Street name must be less than 200 characters")
    .optional()
    .transform(val => val || undefined),
  deliveryNumber: z.string()
    .trim()
    .max(20, "Street number must be less than 20 characters")
    .optional()
    .transform(val => val || undefined),
  deliveryNeighborhood: z.string()
    .trim()
    .max(100, "Neighborhood must be less than 100 characters")
    .optional()
    .transform(val => val || undefined),
  deliveryComplement: z.string()
    .trim()
    .max(200, "Complement must be less than 200 characters")
    .optional()
    .transform(val => val || undefined),
  
  changeAmount: z.number()
    .min(0, "Change amount must be non-negative")
    .optional(),

  couponCode: z.string()
    .trim()
    .max(20, "Coupon code must be less than 20 characters")
    .optional()
    .transform(val => val || undefined),
  
  couponDiscount: z.number()
    .min(0, "Coupon discount must be non-negative")
    .optional(),

  items: z.array(orderItemSchema)
    .min(1, "Order must have at least one item")
    .max(50, "Order cannot have more than 50 items"),
})
.refine((data) => {
  // If delivery type is delivery, require delivery address
  if (data.deliveryType === "delivery") {
    return data.deliveryStreet && data.deliveryNumber && data.deliveryNeighborhood;
  }
  return true;
}, {
  message: "Delivery address is required for delivery orders",
  path: ["deliveryStreet"],
});

export type CreateOrderData = z.infer<typeof orderSchema>;
