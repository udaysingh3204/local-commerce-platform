const express = require("express");
const { protect } = require("../middleware/protect");
const paymentService = require("../services/paymentService");
const { validateBody, schemas } = require("../middleware/validate");
const Order = require("../models/Order");
const {
  getPaymentConfig,
  createPaymentOrder,
  verifyPayment,
  markPaymentFailed
} = require("../controllers/paymentController");

const router = express.Router();

// Legacy endpoints
router.get("/config", getPaymentConfig);
router.post("/create-order", protect, validateBody(schemas.createPaymentOrder), createPaymentOrder);
router.post("/verify", protect, validateBody(schemas.verifyPayment), verifyPayment);
router.post("/fail", protect, markPaymentFailed);

// ============================================
// New Payment Service Endpoints (Phase 2)
// ============================================

/**
 * POST /api/payments/create-upi
 * Create UPI payment intent
 */
router.post('/create-upi', protect, async (req, res) => {
  try {
    const { orderId, amount, vpa } = req.body;
    const { userId } = req.user;

    const result = await paymentService.createUPIPayment(userId, {
      orderId,
      amount,
      vpa,
      notes: { userId, orderId }
    });

    res.json(result);
  } catch (err) {
    console.error('[PaymentRoutes] POST create-upi error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/payments/wallet
 * Get user's wallet balance and status
 */
router.get('/wallet', protect, async (req, res) => {
  try {
    const { userId } = req.user;

    const wallet = await paymentService.getWallet(userId);

    res.json({
      success: true,
      wallet
    });
  } catch (err) {
    console.error('[PaymentRoutes] GET wallet error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/payments/wallet/add
 * Add money to wallet (recharge)
 */
router.post('/wallet/add', protect, async (req, res) => {
  try {
    const { amount, transactionId } = req.body;
    const { userId } = req.user;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    const result = await paymentService.addToWallet(userId, amount, 'wallet_recharge');

    res.json(result);
  } catch (err) {
    console.error('[PaymentRoutes] POST wallet/add error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/payments/use-wallet
 * Pay for order using wallet
 */
router.post('/use-wallet', protect, async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const { userId } = req.user;

    if (!orderId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'orderId and valid amount are required'
      });
    }

    const result = await paymentService.payWithWallet(userId, orderId, amount);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('[PaymentRoutes] POST use-wallet error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/payments/wallet/transactions
 * Get wallet transaction history
 */
router.get('/wallet/transactions', protect, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 20 } = req.query;

    const result = await paymentService.getWalletTransactions(userId, parseInt(limit));

    res.json(result);
  } catch (err) {
    console.error('[PaymentRoutes] GET wallet/transactions error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/payments/methods
 * Get available payment methods for user
 */
router.get('/methods', protect, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await paymentService.getPaymentMethods(userId);

    res.json(result);
  } catch (err) {
    console.error('[PaymentRoutes] GET methods error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/payments/refund
 * Process refund to wallet (admin/system only)
 */
router.post('/refund', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support_agent') {
      return res.status(403).json({
        success: false,
        error: 'Only authorized staff can process refunds'
      });
    }

    const { orderId, amount, reason } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'orderId and amount are required'
      });
    }

    const result = await paymentService.processRefund(
      orderId,
      amount,
      reason || 'customer_request'
    );

    res.json(result);
  } catch (err) {
    console.error('[PaymentRoutes] POST refund error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/payments/order/:orderId
 * Get payment status for an order
 */
router.get('/order/:orderId', protect, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).select(
      'isPaid paidAt totalAmount paymentMethod'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      orderId,
      isPaid: order.isPaid,
      paidAt: order.paidAt,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod || null,
      status: order.isPaid ? 'completed' : 'pending'
    });
  } catch (err) {
    console.error('[PaymentRoutes] GET order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;