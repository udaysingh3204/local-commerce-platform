const axios = require('axios');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * Payment Service - Handle multiple payment methods, UPI, wallets, subscriptions
 * Integrates with Razorpay, Paytm wallet, and internal wallet system
 */
class PaymentService {
  constructor() {
    this.razorpayKey = process.env.RAZORPAY_KEY_ID;
    this.razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    this.razorpayBaseUrl = 'https://api.razorpay.com/v1';

    // Internal wallet balances (normally would be in DB)
    this.walletBalances = new Map();

    // Transaction cache
    this.transactionCache = new Map();
  }

  /**
   * Create payment order (Razorpay)
   * @param {string} userId - Customer user ID
   * @param {object} order - Order details { orderId, amount, currency, type }
   * @returns {object} Razorpay order with id, amount, currency
   */
  async createPaymentOrder(userId, order) {
    try {
      if (!this.razorpayKey || !this.razorpaySecret) {
        throw new Error('Razorpay credentials not configured');
      }

      const payload = {
        amount: Math.round(order.amount * 100), // Convert to paise
        currency: order.currency || 'INR',
        receipt: `order_${order.orderId}_${Date.now()}`,
        notes: {
          orderId: order.orderId,
          userId,
          type: order.type || 'delivery'
        }
      };

      const response = await axios.post(
        `${this.razorpayBaseUrl}/orders`,
        payload,
        {
          auth: {
            username: this.razorpayKey,
            password: this.razorpaySecret
          }
        }
      );

      return {
        success: true,
        razorpayOrderId: response.data.id,
        amount: order.amount,
        currency: response.data.currency,
        status: 'created',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min expiry
      };
    } catch (err) {
      console.error('[PaymentService] createPaymentOrder error:', err.message);
      throw err;
    }
  }

  /**
   * Verify payment after completion
   * @param {object} paymentData - { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature }
   * @returns {boolean} Whether payment is valid
   */
  async verifyPayment(paymentData) {
    try {
      const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = paymentData;

      // Verify signature using Razorpay
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.razorpaySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const isValid = expectedSignature === razorpaySignature;

      if (isValid) {
        // Fetch payment details from Razorpay
        const paymentDetails = await axios.get(
          `${this.razorpayBaseUrl}/payments/${razorpayPaymentId}`,
          {
            auth: {
              username: this.razorpayKey,
              password: this.razorpaySecret
            }
          }
        );

        return {
          success: true,
          isValid: true,
          paymentId: razorpayPaymentId,
          orderId,
          amount: paymentDetails.data.amount / 100, // Convert from paise
          method: paymentDetails.data.method,
          status: paymentDetails.data.status,
          timestamp: new Date(paymentDetails.data.created_at * 1000)
        };
      } else {
        return {
          success: false,
          isValid: false,
          error: 'Signature mismatch'
        };
      }
    } catch (err) {
      console.error('[PaymentService] verifyPayment error:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Create UPI payment intent (simplified for Razorpay)
   * @param {string} userId - Customer user ID
   * @param {object} paymentDetails - { orderId, amount, vpa, notes }
   * @returns {object} UPI payment details
   */
  async createUPIPayment(userId, paymentDetails) {
    try {
      const payload = {
        amount: Math.round(paymentDetails.amount * 100),
        currency: 'INR',
        receipt: `upi_${paymentDetails.orderId}_${Date.now()}`,
        customer_notify: 1,
        method: 'emandate',
        notes: paymentDetails.notes || {}
      };

      // In production: Create UPI mandate/VPA handling
      const response = await axios.post(
        `${this.razorpayBaseUrl}/orders`,
        payload,
        {
          auth: {
            username: this.razorpayKey,
            password: this.razorpaySecret
          }
        }
      );

      return {
        success: true,
        upiOrderId: response.data.id,
        amount: paymentDetails.amount,
        method: 'upi',
        vpa: paymentDetails.vpa || null,
        notes: payload.notes,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };
    } catch (err) {
      console.error('[PaymentService] createUPIPayment error:', err.message);
      throw err;
    }
  }

  /**
   * Get or create wallet for user
   * @param {string} userId - User ID
   * @returns {object} Wallet balance, transactions, status
   */
  async getWallet(userId) {
    try {
      const key = userId.toString();

      // Check cache/memory
      if (this.walletBalances.has(key)) {
        return this.walletBalances.get(key);
      }

      // Fetch from user document
      const user = await User.findById(userId).select('wallet');
      const balance = user?.wallet?.balance || 0;

      const wallet = {
        userId: userId.toString(),
        balance,
        currency: 'INR',
        lastUpdated: new Date(),
        transactions: [],
        status: balance > 0 ? 'active' : 'empty'
      };

      this.walletBalances.set(key, wallet);
      return wallet;
    } catch (err) {
      console.error('[PaymentService] getWallet error:', err.message);
      throw err;
    }
  }

  /**
   * Add money to wallet (e.g., refund, earning, cashback)
   * @param {string} userId - User ID
   * @param {number} amount - Amount to add
   * @param {string} reason - Reason for credit
   * @returns {object} Updated wallet
   */
  async addToWallet(userId, amount, reason = 'credit') {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const previousBalance = user.wallet?.balance || 0;
      const newBalance = previousBalance + amount;

      // Update user wallet
      user.wallet = {
        balance: newBalance,
        lastUpdated: new Date()
      };
      await user.save();

      // Log transaction
      const transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userId.toString(),
        type: 'credit',
        amount,
        reason,
        previousBalance,
        newBalance,
        timestamp: new Date()
      };

      this.transactionCache.set(transaction.id, transaction);

      // Update cache
      const key = userId.toString();
      const wallet = this.walletBalances.get(key) || {};
      wallet.balance = newBalance;
      this.walletBalances.set(key, wallet);

      return {
        success: true,
        balance: newBalance,
        previous: previousBalance,
        credited: amount,
        transaction
      };
    } catch (err) {
      console.error('[PaymentService] addToWallet error:', err.message);
      throw err;
    }
  }

  /**
   * Withdraw money from wallet
   * @param {string} userId - User ID
   * @param {number} amount - Amount to deduct
   * @param {string} reason - Reason for debit
   * @returns {object} Updated wallet
   */
  async deductFromWallet(userId, amount, reason = 'order_payment') {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const previousBalance = user.wallet?.balance || 0;
      if (previousBalance < amount) {
        return {
          success: false,
          error: 'Insufficient wallet balance'
        };
      }

      const newBalance = previousBalance - amount;

      // Update user wallet
      user.wallet = {
        balance: newBalance,
        lastUpdated: new Date()
      };
      await user.save();

      // Log transaction
      const transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userId.toString(),
        type: 'debit',
        amount,
        reason,
        previousBalance,
        newBalance,
        timestamp: new Date()
      };

      this.transactionCache.set(transaction.id, transaction);

      // Update cache
      const key = userId.toString();
      const wallet = this.walletBalances.get(key) || {};
      wallet.balance = newBalance;
      this.walletBalances.set(key, wallet);

      return {
        success: true,
        balance: newBalance,
        previous: previousBalance,
        debited: amount,
        transaction
      };
    } catch (err) {
      console.error('[PaymentService] deductFromWallet error:', err.message);
      throw err;
    }
  }

  /**
   * Pay order with wallet (full or partial)
   * @param {string} userId - User ID
   * @param {string} orderId - Order ID
   * @param {number} amount - Amount to pay from wallet
   * @returns {object} Payment result
   */
  async payWithWallet(userId, orderId, amount) {
    try {
      const order = await Order.findById(orderId);
      if (!order) throw new Error('Order not found');

      if (amount > order.totalAmount) {
        return {
          success: false,
          error: 'Payment amount exceeds order total'
        };
      }

      const result = await this.deductFromWallet(userId, amount, `order_${orderId}`);
      if (!result.success) return result;

      // Update order payment status
      const paymentMethod = order.paymentMethod || {};
      paymentMethod.walletDeducted = amount;
      paymentMethod.walletBalance = result.balance;
      paymentMethod.timestamp = new Date();

      order.paymentMethod = paymentMethod;

      // Mark as fully paid if wallet covers entire amount
      if (amount >= order.totalAmount) {
        order.isPaid = true;
        order.paidAt = new Date();
      }

      await order.save();

      return {
        success: true,
        orderId,
        paidAmount: amount,
        remainingAmount: Math.max(0, order.totalAmount - amount),
        walletBalance: result.balance,
        paymentStatus: amount >= order.totalAmount ? 'completed' : 'partial'
      };
    } catch (err) {
      console.error('[PaymentService] payWithWallet error:', err.message);
      throw err;
    }
  }

  /**
   * Get wallet transaction history
   */
  async getWalletTransactions(userId, limit = 20) {
    try {
      // Fetch from cache and database
      const transactions = Array.from(this.transactionCache.values())
        .filter(t => t.userId === userId.toString())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      return {
        success: true,
        transactions,
        count: transactions.length
      };
    } catch (err) {
      console.error('[PaymentService] getWalletTransactions error:', err.message);
      throw err;
    }
  }

  /**
   * Process refund to wallet or original payment method
   * @param {string} orderId - Order ID
   * @param {number} amount - Refund amount
   * @param {string} reason - Refund reason
   * @returns {object} Refund status
   */
  async processRefund(orderId, amount, reason = 'customer_request') {
    try {
      const order = await Order.findById(orderId).populate('userId');
      if (!order) throw new Error('Order not found');

      // Add to user's wallet
      const refundResult = await this.addToWallet(
        order.userId._id,
        amount,
        `refund_${reason}`
      );

      // Update order
      order.refundAmount = amount;
      order.refundReason = reason;
      order.refundedAt = new Date();
      order.refundStatus = 'completed';
      await order.save();

      return {
        success: true,
        refundAmount: amount,
        userId: order.userId._id,
        walletBalance: refundResult.balance,
        orderId,
        refundMethod: 'wallet'
      };
    } catch (err) {
      console.error('[PaymentService] processRefund error:', err.message);
      throw err;
    }
  }

  /**
   * Get payment methods for user
   */
  async getPaymentMethods(userId) {
    try {
      const user = await User.findById(userId).select('paymentMethods wallet');

      return {
        success: true,
        methods: [
          {
            id: 'wallet',
            name: 'LocalMart Wallet',
            type: 'wallet',
            balance: user?.wallet?.balance || 0,
            default: true
          },
          {
            id: 'upi',
            name: 'UPI',
            type: 'upi',
            enabled: true
          },
          {
            id: 'card',
            name: 'Credit/Debit Card',
            type: 'card',
            enabled: true
          },
          {
            id: 'netbanking',
            name: 'Net Banking',
            type: 'netbanking',
            enabled: true
          }
        ],
        wallet: user?.wallet || { balance: 0 }
      };
    } catch (err) {
      console.error('[PaymentService] getPaymentMethods error:', err.message);
      throw err;
    }
  }
}

// Export singleton
module.exports = new PaymentService();
