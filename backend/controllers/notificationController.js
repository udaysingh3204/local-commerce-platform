const Notification = require("../models/Notification");
const User = require("../models/User");

const resolveUserId = (req) => req.user?.id || req.user?.userId || req.user?._id || null;

const buildTitle = (notification) => {
  if (notification.title) return notification.title;

  const titleMap = {
    order: "Order update",
    delivery: "Delivery signal",
    system: "LocalMart update",
    promo: "Offer unlocked",
    payment: "Payment update",
    chat: "Support message",
    chat_message: "Support message",
    wholesale: "Wholesale update",
  };

  return titleMap[notification.type] || "LocalMart update";
};

const serializeNotification = (notification) => ({
  _id: notification._id,
  userId: notification.userId,
  title: buildTitle(notification),
  message: notification.message,
  type: notification.type || "system",
  isRead: Boolean(notification.isRead),
  orderId: notification.orderId || null,
  data: notification.data || null,
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt,
});

const getFeedQuery = (userId, req) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const sortValue = String(req.query.sort || "-createdAt");
  const sortDirection = sortValue.startsWith("-") ? -1 : 1;
  const sortField = sortValue.replace(/^-/, "") || "createdAt";

  return {
    query: { userId },
    limit,
    sort: { [sortField]: sortDirection },
  };
};

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const feed = getFeedQuery(userId, req);
    const notifications = await Notification.find(feed.query)
      .sort(feed.sort)
      .limit(feed.limit)
      .lean();

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    res.json({
      notifications: notifications.map(serializeNotification),
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getNotifications = async (req, res) => {

  try {

    const notifications = await Notification.find({
      userId: req.params.userId
    }).sort({ createdAt: -1 });

    res.json(notifications.map((notification) => serializeNotification(notification)));

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};

exports.markAllRead = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markOneRead = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, userId },
      { $set: { isRead: true } },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ notification: serializeNotification(notification) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* Save / update the Expo push token for the logged-in user */
exports.registerPushToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "token required" });
    }
    await User.findByIdAndUpdate(req.user._id, { expoPushToken: token });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* Clear the token on logout */
exports.clearPushToken = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { expoPushToken: null });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
