const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require("../models/Order");
const { looksLikeSafeDemoDatabase } = require("../services/demoDataService");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY || "test",
  key_secret: process.env.RAZORPAY_SECRET || "test"
});

const isMockPaymentMode = () => (
  !process.env.RAZORPAY_KEY ||
  !process.env.RAZORPAY_SECRET ||
  process.env.RAZORPAY_KEY === "test" ||
  process.env.RAZORPAY_SECRET === "test" ||
  process.env.RAZORPAY_KEY.startsWith("rzp_test_")
)

exports.getPaymentConfig = async (req, res) => {
  res.json({
    provider: "razorpay",
    key: process.env.RAZORPAY_KEY || "",
    currency: "INR",
    isMock: isMockPaymentMode(),
    merchantName: process.env.RAZORPAY_BRAND_NAME || "LocalMart",
    description: process.env.RAZORPAY_BRAND_DESCRIPTION || "Neighborhood-first local commerce",
  })
}

const resolveOrderIdFromWebhookPayload = (payload = {}) => {
  const entity = payload?.payload?.payment?.entity || payload?.payload?.order?.entity || {}
  const notes = entity?.notes || {}
  const noteOrderId = typeof notes.orderId === "string" ? notes.orderId : ""

  if (noteOrderId) {
    return noteOrderId
  }

  const receipt = typeof entity.receipt === "string" ? entity.receipt : ""
  if (receipt.startsWith("order_")) {
    const candidate = receipt.slice("order_".length)
    if (/^[0-9a-fA-F]{24}$/.test(candidate)) {
      return candidate
    }
  }

  return ""
}

const updateOrderFromWebhook = async ({ orderId, event, entity }) => {
  if (!orderId) return null

  if (["payment.captured", "order.paid"].includes(event)) {
    return Order.findByIdAndUpdate(
      orderId,
      {
        paymentStatus: "paid",
        paymentFailureReason: "",
        paymentRecoveredAt: new Date(),
        paymentReference: entity?.id || entity?.order_id || entity?.acquirer_data?.rrn || undefined,
      },
      { new: true }
    )
  }

  if (event === "payment.failed") {
    const reason = entity?.error_description || entity?.description || entity?.error_reason || "Payment failed"
    return Order.findByIdAndUpdate(
      orderId,
      {
        paymentStatus: "failed",
        paymentFailureReason: reason,
        lastPaymentAttemptAt: new Date(),
      },
      { new: true }
    )
  }

  return null
}

const touchPaymentAttempt = async ({ orderId, paymentMethod, paymentReference }) => {
  if (!orderId) return null

  return Order.findByIdAndUpdate(
    orderId,
    {
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(paymentReference ? { paymentReference } : {}),
      paymentStatus: "pending",
      paymentFailureReason: "",
      lastPaymentAttemptAt: new Date(),
      $inc: { paymentAttemptCount: 1 },
    },
    { new: true }
  )
}

const resolveOrderAmount = async (orderId, amount) => {
  if (typeof amount === "number" && amount > 0) {
    return amount
  }

  if (!orderId) {
    return null
  }

  const order = await Order.findById(orderId).select("totalAmount")
  return order?.totalAmount || null
}


/* CREATE PAYMENT ORDER */

exports.createPaymentOrder = async (req, res) => {

  try {

    const { amount, orderId, paymentMethod } = req.body;

    const resolvedAmount = await resolveOrderAmount(orderId, amount)

    if (!resolvedAmount || resolvedAmount <= 0) {
      return res.status(400).json({ message: "A valid amount is required" })
    }

    const receipt = orderId ? `order_${orderId}` : `order_${Date.now()}`

    if (isMockPaymentMode()) {
      const mockOrderId = `mock_order_${Date.now()}`
      const linkedOrder = await touchPaymentAttempt({
        orderId,
        paymentMethod: paymentMethod || "razorpay",
        paymentReference: mockOrderId,
      })

      return res.json({
        id: mockOrderId,
        amount: resolvedAmount * 100,
        currency: "INR",
        receipt,
        status: "created",
        isMock: true,
        order: linkedOrder,
      })
    }

    const options = {
      amount: resolvedAmount * 100,
      currency: "INR",
      receipt,
      notes: {
        orderId: orderId || "",
        paymentMethod: paymentMethod || "razorpay",
      },
    };

    const order = await razorpay.orders.create(options);

    const linkedOrder = await touchPaymentAttempt({
      orderId,
      paymentMethod: paymentMethod || "razorpay",
      paymentReference: order.id,
    })

    res.json({ ...order, order: linkedOrder });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};


/* VERIFY PAYMENT */

exports.verifyPayment = async (req, res) => {

  try {

    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentMethod,
      isMock,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" })
    }

    const mockSuccess = Boolean(isMock) && looksLikeSafeDemoDatabase(process.env.MONGO_URI || "")

    let verified = mockSuccess

    if (!verified) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: "Payment verification payload is incomplete" })
      }

      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      verified = generatedSignature === razorpay_signature
    }

    if (verified) {
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: "paid",
          paymentFailureReason: "",
          paymentRecoveredAt: new Date(),
          ...(paymentMethod ? { paymentMethod } : {}),
          paymentReference: razorpay_payment_id || razorpay_order_id || `mock_payment_${Date.now()}`,
        },
        { new: true }
      )

      return res.json({
        success: true,
        message: "Payment verified successfully",
        order: updatedOrder,
      });

    }

    res.status(400).json({
      success: false,
      message: "Invalid payment signature"
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};

exports.markPaymentFailed = async (req, res) => {
  try {
    const { orderId, reason, paymentMethod } = req.body

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" })
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        paymentStatus: "failed",
        paymentFailureReason: reason || "Payment attempt failed",
        ...(paymentMethod ? { paymentMethod } : {}),
        lastPaymentAttemptAt: new Date(),
        $inc: { paymentAttemptCount: 1 },
      },
      { new: true }
    )

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    res.json({
      success: true,
      message: "Payment marked as failed",
      order,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.handlePaymentWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!webhookSecret) {
      return res.status(503).json({ message: "Razorpay webhook secret is not configured" })
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}))
    const receivedSignature = req.headers["x-razorpay-signature"]

    if (!receivedSignature || typeof receivedSignature !== "string") {
      return res.status(400).json({ message: "Missing Razorpay webhook signature" })
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex")

    if (expectedSignature !== receivedSignature) {
      return res.status(400).json({ message: "Invalid Razorpay webhook signature" })
    }

    const payload = JSON.parse(rawBody.toString("utf8"))
    const entity = payload?.payload?.payment?.entity || payload?.payload?.order?.entity || {}
    const orderId = resolveOrderIdFromWebhookPayload(payload)

    await updateOrderFromWebhook({
      orderId,
      event: payload?.event,
      entity,
    })

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}