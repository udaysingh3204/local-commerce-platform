const User = require("../models/User");
const Order = require("../models/Order");
const Store = require("../models/Store");
const WholesaleOrder = require("../models/WholesaleOrder");
const WholesaleProduct = require("../models/WholesaleProduct");
const RefreshToken = require("../models/RefreshToken");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const emailService = require("../services/emailService");
const logger = require("../config/logger");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getAdminAllowlist = () => (process.env.ADMIN_GOOGLE_ALLOWLIST || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

const signToken = (user) => jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET || "fallback_secret",
  { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
);

const issueRefreshToken = async (userId, userType = "user", meta = {}) => {
  const token = crypto.randomBytes(48).toString("hex")
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  await RefreshToken.create({
    userId,
    userType,
    token,
    expiresAt,
    ipAddress: meta.ip || "",
    userAgent: meta.ua || "",
  })
  return token
}

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
  authProvider: user.authProvider,
});

/* ================= REGISTER ================= */

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const allowedRoles = ["customer", "vendor", "delivery", "supplier"];
    const assignedRole = allowedRoles.includes(role) ? role : "customer";

    const user = await User.create({
      name,
      email,
      phone: phone || "",
      password: hashedPassword,
      role: assignedRole,
      authProvider: "local"
    });

    const [token, refreshToken] = await Promise.all([
      signToken(user),
      issueRefreshToken(user._id, "user", {
        ip: req.ip,
        ua: req.headers["user-agent"] || "",
      }),
    ])

    // Fire-and-forget welcome email
    emailService.sendWelcome(user).catch(() => {})

    res.status(201).json({
      message: "User registered successfully",
      token,
      refreshToken,
      user: sanitizeUser(user)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= LOGIN ================= */

exports.login = async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "This account uses Google sign-in" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const [token, refreshToken] = await Promise.all([
      signToken(user),
      issueRefreshToken(user._id, "user", {
        ip: req.ip,
        ua: req.headers["user-agent"] || "",
      }),
    ])

    res.json({
      token,
      refreshToken,
      user: sanitizeUser(user)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { credential, role } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: "Google auth is not configured" });
    }

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({ message: "Google account email is required" });
    }

    const allowedRoles = ["customer", "vendor", "delivery", "supplier", "admin"];
    const requestedRole = allowedRoles.includes(role) ? role : "customer";
    const email = payload.email.toLowerCase()

    let assignedRole = requestedRole
    if (requestedRole === "admin") {
      const existingAdmin = await User.findOne({ email, role: "admin" })
      const isAllowlisted = getAdminAllowlist().includes(email)

      if (!existingAdmin && !isAllowlisted) {
        return res.status(403).json({ message: "This Google account is not allowed for admin access" })
      }
    }

    let user = await User.findOne({ email: payload.email });

    if (user?.role === "admin") {
      assignedRole = "admin"
    }

    if (!user) {
      user = await User.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        phone: "",
        password: null,
        role: assignedRole,
        authProvider: "google",
        googleId: payload.sub,
        avatar: payload.picture || "",
      });
    } else {
      if (requestedRole === "admin" && user.role !== "admin") {
        const isAllowlisted = getAdminAllowlist().includes(email)
        if (!isAllowlisted) {
          return res.status(403).json({ message: "This Google account is not allowed for admin access" })
        }
        user.role = "admin"
      }

      user.googleId = user.googleId || payload.sub;
      if (user.password && user.authProvider === "local") {
        user.authProvider = "hybrid";
      } else if (!user.password) {
        user.authProvider = "google";
      }
      user.avatar = payload.picture || user.avatar || "";
      if (!user.name && payload.name) user.name = payload.name;
      await user.save();
    }

    res.json({
      token: signToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(401).json({ message: "Google sign-in failed", error: error.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.bootstrap = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const startup = {
      activeOrders: 0,
      pendingPayments: 0,
      storesCount: 0,
      wholesaleOrders: 0,
      productLines: 0,
      unassignedOrders: 0,
    }

    if (user.role === "customer") {
      [startup.activeOrders, startup.pendingPayments] = await Promise.all([
        Order.countDocuments({
          customerId: user._id,
          status: { $in: ["pending", "accepted", "preparing", "out_for_delivery"] },
        }),
        Order.countDocuments({
          customerId: user._id,
          paymentStatus: { $in: ["pending", "failed"] },
          status: { $nin: ["cancelled", "delivered"] },
        }),
      ])
    }

    if (user.role === "vendor") {
      const stores = await Store.find({ vendorId: user._id }).select("_id").lean()
      const storeIds = stores.map((store) => store._id)
      startup.storesCount = stores.length

      if (storeIds.length > 0) {
        ;[startup.activeOrders, startup.pendingPayments] = await Promise.all([
          Order.countDocuments({
            storeId: { $in: storeIds },
            status: { $in: ["pending", "accepted", "preparing", "out_for_delivery"] },
          }),
          Order.countDocuments({
            storeId: { $in: storeIds },
            paymentStatus: { $in: ["pending", "failed"] },
            status: { $nin: ["cancelled", "delivered"] },
          }),
        ])
      }
    }

    if (user.role === "supplier") {
      ;[startup.wholesaleOrders, startup.productLines] = await Promise.all([
        WholesaleOrder.countDocuments({ supplierId: user._id }),
        WholesaleProduct.countDocuments({ supplierId: user._id }),
      ])
    }

    if (user.role === "admin") {
      ;[startup.activeOrders, startup.pendingPayments, startup.unassignedOrders] = await Promise.all([
        Order.countDocuments({
          status: { $in: ["pending", "accepted", "preparing", "out_for_delivery"] },
        }),
        Order.countDocuments({
          paymentStatus: { $in: ["pending", "failed"] },
          status: { $nin: ["cancelled", "delivered"] },
        }),
        Order.countDocuments({
          status: { $in: ["accepted", "preparing"] },
          $or: [
            { deliveryPartnerId: { $exists: false } },
            { deliveryPartnerId: null },
          ],
        }),
      ])
    }

    res.json({
      user: sanitizeUser(user),
      session: {
        roleHome: user.role === "admin"
          ? "/"
          : user.role === "vendor"
            ? "/orders"
            : user.role === "supplier"
              ? "/"
              : user.role === "delivery"
                ? "/"
                : "/",
      },
      startup,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/* ================= REFRESH TOKEN ================= */

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" })
    }

    const stored = await RefreshToken.findOne({ token: refreshToken, userType: "user", isRevoked: false })
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: "Refresh token is invalid or expired. Please log in again." })
    }

    const user = await User.findById(stored.userId)
    if (!user) {
      return res.status(401).json({ message: "User not found" })
    }

    // Rotate: revoke old token, issue new pair
    stored.isRevoked = true
    await stored.save()

    const [newAccessToken, newRefreshToken] = await Promise.all([
      signToken(user),
      issueRefreshToken(user._id, "user", { ip: req.ip, ua: req.headers["user-agent"] || "" }),
    ])

    res.json({ token: newAccessToken, refreshToken: newRefreshToken, user: sanitizeUser(user) })
  } catch (error) {
    logger.error("[auth] refresh error", { error: error.message })
    res.status(500).json({ error: error.message })
  }
}

/* ================= LOGOUT ================= */

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (refreshToken) {
      await RefreshToken.updateOne({ token: refreshToken }, { isRevoked: true })
    }
    res.json({ message: "Logged out successfully" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/* ================= FORGOT PASSWORD ================= */

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ message: "Email is required" })
    }

    const user = await User.findOne({ email })

    // Always return 200 to prevent user enumeration
    if (!user || user.authProvider === "google") {
      return res.json({ message: "If that email is registered, a reset link has been sent." })
    }

    const resetToken = crypto.randomBytes(32).toString("hex")
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    user.passwordResetToken = hashedToken
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()

    await emailService.sendPasswordReset(user, resetToken)

    res.json({ message: "If that email is registered, a reset link has been sent." })
  } catch (error) {
    logger.error("[auth] forgotPassword error", { error: error.message })
    res.status(500).json({ error: error.message })
  }
}

/* ================= RESET PASSWORD ================= */

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" })
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" })
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({ message: "Reset token is invalid or has expired" })
    }

    user.password = await bcrypt.hash(password, 12)
    user.passwordResetToken = null
    user.passwordResetExpires = null
    await user.save()

    // Revoke all existing refresh tokens after password reset
    await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true })

    logger.info("[auth] Password reset successful", { userId: user._id })
    res.json({ message: "Password reset successfully. Please log in with your new password." })
  } catch (error) {
    logger.error("[auth] resetPassword error", { error: error.message })
    res.status(500).json({ error: error.message })
  }
}
