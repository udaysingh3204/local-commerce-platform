const { Resend } = require("resend")
const logger = require("../config/logger")

// Lazy-instantiate so missing RESEND_API_KEY only silently disables email,
// rather than crashing the process at require-time.
let _resend = null
const getResend = () => {
  if (!_resend && process.env.RESEND_API_KEY) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

const FROM = process.env.EMAIL_FROM || "LocalMart <noreply@localmart.in>"
const BRAND_COLOR = "#6366f1"
const SITE_URL = process.env.CUSTOMER_APP_URL || "https://localmart.in"

const isEmailEnabled = () => Boolean(process.env.RESEND_API_KEY)

// ── HTML layout wrapper ───────────────────────────────────────────────────────
const layout = (title, bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 580px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .header { background: ${BRAND_COLOR}; padding: 28px 32px; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; }
    .header p { margin: 4px 0 0; color: rgba(255,255,255,0.75); font-size: 13px; }
    .body { padding: 32px; color: #0f172a; font-size: 15px; line-height: 1.6; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 20px 0; }
    .card-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
    .card-row .label { color: #64748b; }
    .card-row .value { font-weight: 600; }
    .btn { display: inline-block; background: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 20px 0; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    .footer { background: #f8fafc; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 99px; }
    .badge-warn { background: #fff7ed; color: #c2410c; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; color: #64748b; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🛍️ LocalMart</h1>
      <p>Your neighbourhood commerce platform</p>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} LocalMart · <a href="${SITE_URL}/privacy" style="color:#6366f1">Privacy</a> · <a href="${SITE_URL}/terms" style="color:#6366f1">Terms</a></p>
      <p>You received this because you have an account on LocalMart.</p>
    </div>
  </div>
</body>
</html>
`

// ── Email senders ─────────────────────────────────────────────────────────────

const send = async ({ to, subject, html }) => {
  if (!isEmailEnabled()) {
    logger.debug("[email] RESEND_API_KEY not configured — skipping email", { to, subject })
    return null
  }
  try {
    const result = await getResend().emails.send({ from: FROM, to, subject, html })
    logger.info("[email] Sent", { to, subject, id: result.id })
    return result
  } catch (err) {
    logger.error("[email] Failed to send email", { to, subject, error: err.message })
    return null
  }
}

// ── Order Confirmation ────────────────────────────────────────────────────────
const sendOrderConfirmation = async (order, user) => {
  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td>${item.name || "Item"}</td>
      <td style="text-align:right;">${item.quantity}</td>
      <td style="text-align:right;">₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
    </tr>
  `).join("")

  const breakdown = order.pricingBreakdown || {}
  const html = layout("Order Confirmed — LocalMart", `
    <p style="font-size:18px;font-weight:700;margin:0 0 4px;">Order Confirmed! 🎉</p>
    <p style="color:#64748b;margin:0 0 24px;">Hi ${user.name || "there"}, your order has been received and is being prepared.</p>

    <div class="card">
      <div class="card-row">
        <span class="label">Order ID</span>
        <span class="value">#${order._id?.toString().slice(-8).toUpperCase()}</span>
      </div>
      <div class="card-row">
        <span class="label">Payment</span>
        <span class="value">${order.paymentMethod?.toUpperCase() || "COD"}</span>
      </div>
      <div class="card-row">
        <span class="label">Status</span>
        <span class="badge">Confirmed</span>
      </div>
    </div>

    <table>
      <thead>
        <tr><th>Item</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Amount</th></tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="card" style="margin-top:16px;">
      ${breakdown.discountAmount > 0 ? `<div class="card-row"><span class="label">Subtotal</span><span class="value">₹${(breakdown.subtotalAmount || 0).toFixed(2)}</span></div>` : ""}
      ${breakdown.discountAmount > 0 ? `<div class="card-row"><span class="label">Discount</span><span class="value" style="color:#10b981;">–₹${(breakdown.discountAmount || 0).toFixed(2)}</span></div>` : ""}
      <div class="card-row" style="font-size:16px;font-weight:700;">
        <span>Total</span>
        <span>₹${(order.totalAmount || 0).toFixed(2)}</span>
      </div>
    </div>

    <a href="${SITE_URL}/orders" class="btn">Track Your Order</a>

    <hr class="divider" />
    <p style="color:#64748b;font-size:13px;">Estimated delivery: within 45–60 minutes. We'll notify you when your order is out for delivery.</p>
  `)

  return send({ to: user.email, subject: `Order Confirmed — #${order._id?.toString().slice(-8).toUpperCase()}`, html })
}

// ── Order Dispatched ──────────────────────────────────────────────────────────
const sendOrderDispatched = async (order, user, driver) => {
  const html = layout("Your Order is on the Way — LocalMart", `
    <p style="font-size:18px;font-weight:700;margin:0 0 4px;">Your order is out for delivery! 🛵</p>
    <p style="color:#64748b;margin:0 0 24px;">Hi ${user.name || "there"}, your order is on its way to you.</p>

    <div class="card">
      <div class="card-row">
        <span class="label">Order ID</span>
        <span class="value">#${order._id?.toString().slice(-8).toUpperCase()}</span>
      </div>
      ${driver ? `<div class="card-row"><span class="label">Driver</span><span class="value">${driver.name || "Your LocalMart driver"}</span></div>` : ""}
      <div class="card-row">
        <span class="label">ETA</span>
        <span class="value">${order.estimatedDeliveryTime ? `~${order.estimatedDeliveryTime} minutes` : "Tracking live"}</span>
      </div>
    </div>

    <a href="${SITE_URL}/track/${order._id}" class="btn">Track Live</a>
  `)

  return send({ to: user.email, subject: "Your order is out for delivery 🛵", html })
}

// ── Order Delivered ───────────────────────────────────────────────────────────
const sendOrderDelivered = async (order, user) => {
  const html = layout("Order Delivered — LocalMart", `
    <p style="font-size:18px;font-weight:700;margin:0 0 4px;">Delivered! ✅</p>
    <p style="color:#64748b;margin:0 0 24px;">Hi ${user.name || "there"}, your order has been delivered. Enjoy!</p>

    <div class="card">
      <div class="card-row">
        <span class="label">Order ID</span>
        <span class="value">#${order._id?.toString().slice(-8).toUpperCase()}</span>
      </div>
      <div class="card-row">
        <span class="label">Total Paid</span>
        <span class="value">₹${(order.totalAmount || 0).toFixed(2)}</span>
      </div>
    </div>

    <p style="color:#64748b;">Loved your order? Leave a review to help others discover great local stores.</p>
    <a href="${SITE_URL}/orders" class="btn">Leave a Review</a>
  `)

  return send({ to: user.email, subject: "Your order has been delivered ✅", html })
}

// ── Password Reset ────────────────────────────────────────────────────────────
const sendPasswordReset = async (user, resetToken) => {
  const resetUrl = `${SITE_URL}/reset-password?token=${resetToken}`
  const html = layout("Reset Your Password — LocalMart", `
    <p style="font-size:18px;font-weight:700;margin:0 0 4px;">Reset your password</p>
    <p style="color:#64748b;margin:0 0 24px;">Hi ${user.name || "there"}, we received a request to reset your LocalMart password.</p>

    <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
    <a href="${resetUrl}" class="btn">Reset Password</a>

    <hr class="divider" />
    <p style="color:#94a3b8;font-size:13px;">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
  `)

  return send({ to: user.email, subject: "Reset your LocalMart password", html })
}

// ── Welcome ───────────────────────────────────────────────────────────────────
const sendWelcome = async (user) => {
  const html = layout("Welcome to LocalMart!", `
    <p style="font-size:18px;font-weight:700;margin:0 0 4px;">Welcome to LocalMart, ${user.name || "there"}! 🎉</p>
    <p style="color:#64748b;margin:0 0 24px;">We're glad you joined. Discover amazing local stores and get fresh groceries delivered to your door.</p>

    <a href="${SITE_URL}" class="btn">Start Shopping</a>

    <hr class="divider" />
    <p style="color:#64748b;font-size:13px;">Have questions? Reply to this email and our support team will help you.</p>
  `)

  return send({ to: user.email, subject: "Welcome to LocalMart! 🛍️", html })
}

// ── Low Stock Alert (vendor) ──────────────────────────────────────────────────
const sendLowStockAlert = async (vendorEmail, vendorName, products) => {
  const rows = products.map(p => `
    <tr>
      <td>${p.name}</td>
      <td style="text-align:right;"><span class="badge badge-warn">${p.stock} left</span></td>
    </tr>
  `).join("")

  const html = layout("Low Stock Alert — LocalMart Vendor", `
    <p style="font-size:18px;font-weight:700;margin:0 0 4px;">⚠️ Low Stock Alert</p>
    <p style="color:#64748b;margin:0 0 24px;">Hi ${vendorName || "there"}, the following products are running low on stock:</p>

    <table>
      <thead>
        <tr><th>Product</th><th style="text-align:right;">Stock</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <a href="${process.env.VENDOR_APP_URL || "https://vendor.localmart.in"}/products" class="btn">Update Stock</a>
  `)

  return send({ to: vendorEmail, subject: "⚠️ Low stock alert — action needed", html })
}

module.exports = {
  sendOrderConfirmation,
  sendOrderDispatched,
  sendOrderDelivered,
  sendPasswordReset,
  sendWelcome,
  sendLowStockAlert,
  isEmailEnabled,
}
