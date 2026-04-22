const { z } = require("zod")

/**
 * Express middleware factory — validates req.body against a Zod schema.
 * Returns 400 with field-level errors on failure.
 */
const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    const fieldErrors = result.error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }))
    return res.status(400).json({
      error: "Validation failed",
      fields: fieldErrors,
    })
  }
  req.body = result.data  // use the parsed (coerced) data
  return next()
}

// ── Auth schemas ─────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  phone: z.string().regex(/^[0-9+\- ]{7,15}$/, "Invalid phone number").optional().or(z.literal("")),
  role: z.enum(["customer", "vendor", "delivery", "supplier"]).optional(),
})

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
})

// ── Order schemas ─────────────────────────────────────────────────────────────

const createOrderSchema = z.object({
  customerId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid customer ID"),
  storeId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid store ID"),
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID"),
        quantity: z.number().int().positive("Quantity must be a positive integer"),
        price: z.number().nonnegative().optional(),
        name: z.string().optional(),
      })
    )
    .min(1, "Order must have at least one item"),
  totalAmount: z.number().nonnegative().optional(),
  paymentMethod: z.enum(["cod", "upi", "razorpay"]).optional().default("cod"),
  deliveryAddress: z
    .object({
      line: z.string().min(1),
      city: z.string().min(1),
      pincode: z.string().regex(/^[0-9]{6}$/, "Invalid pincode"),
    })
    .optional(),
  promotion: z
    .object({
      campaignId: z.string().min(1),
      code: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
      discountAmount: z.number().nonnegative().optional(),
    })
    .optional(),
  couponCode: z.string().optional(),
  promotionId: z.string().optional(),
  customerLocation: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
})

// ── Product schemas ───────────────────────────────────────────────────────────

const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  price: z.number().positive("Price must be positive"),
  stock: z.number().int().nonnegative("Stock cannot be negative").optional(),
  category: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  image: z.string().url("Invalid image URL").optional().or(z.literal("")),
})

const updateProductSchema = createProductSchema.partial()

// ── Payment schemas ───────────────────────────────────────────────────────────

const createPaymentOrderSchema = z.object({
  orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID").optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  paymentMethod: z.enum(["cod", "upi", "razorpay"]).optional(),
})

const verifyPaymentSchema = z.object({
  orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID"),
  razorpay_order_id: z.string().optional(),
  razorpay_payment_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
  paymentMethod: z.enum(["cod", "upi", "razorpay"]).optional(),
  isMock: z.boolean().optional(),
})

// ── Review schemas ────────────────────────────────────────────────────────────

const createReviewSchema = z.object({
  targetType: z.enum(["product", "store"]),
  targetId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid target ID"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().max(1000).optional().default(""),
  orderId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
})

// ── Address schemas ───────────────────────────────────────────────────────────

const createAddressSchema = z.object({
  label: z.enum(["home", "work", "other"]).optional().default("home"),
  fullName: z.string().min(1, "Full name is required").max(100),
  phone: z.string().regex(/^[0-9+\- ]{7,15}$/, "Invalid phone number"),
  line1: z.string().min(1, "Address line 1 is required").max(200),
  line2: z.string().max(200).optional().default(""),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  pincode: z.string().regex(/^[0-9]{6}$/, "Pincode must be 6 digits"),
  isDefault: z.boolean().optional().default(false),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

module.exports = {
  validateBody,
  schemas: {
    register: registerSchema,
    login: loginSchema,
    forgotPassword: forgotPasswordSchema,
    resetPassword: resetPasswordSchema,
    createOrder: createOrderSchema,
    createProduct: createProductSchema,
    updateProduct: updateProductSchema,
    createPaymentOrder: createPaymentOrderSchema,
    verifyPayment: verifyPaymentSchema,
    createReview: createReviewSchema,
    createAddress: createAddressSchema,
  },
}
