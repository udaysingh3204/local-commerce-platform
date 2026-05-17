const WholesaleProduct = require("../models/WholesaleProduct");
const WholesaleOrder = require("../models/WholesaleOrder");
const Notification = require("../models/Notification");

const ALLOWED_WHOLESALE_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const STATUS_TIMESTAMP_FIELD = {
  confirmed: "confirmedAt",
  shipped: "shippedAt",
  delivered: "deliveredAt",
  cancelled: "cancelledAt",
};

const WHOLESALE_STATUS_LABEL = {
  pending: "pending",
  confirmed: "confirmed",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
};

const normalizeText = (value, maxLength = 400) => {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, maxLength);
};

const notifyWholesaleStatusChange = async (order, status) => {
  const recipients = [order.retailerId, order.supplierId].filter(Boolean);

  if (!recipients.length) return;

  const statusLabel = WHOLESALE_STATUS_LABEL[status] || status;
  const orderCode = String(order._id).slice(-8).toUpperCase();
  const cancelledMessage = order.cancellationReason
    ? ` Reason: ${order.cancellationReason}`
    : "";

  await Notification.insertMany(
    recipients.map((userId) => ({
      userId,
      type: "wholesale",
      title: `Wholesale order ${statusLabel}`,
      message: `Wholesale order #${orderCode} has been marked ${statusLabel}.${status === "cancelled" ? cancelledMessage : ""}`,
      data: {
        orderId: order._id,
        scope: "wholesale",
        status,
        supplierId: order.supplierId,
        retailerId: order.retailerId,
        cancellationReason: order.cancellationReason || null,
      },
      isRead: false,
    }))
  );
};

const resolveWholesaleOrderForActor = async (orderId, req) => {
  const order = await WholesaleOrder.findById(orderId);

  if (!order) {
    return { error: { status: 404, body: { error: "Wholesale order not found" } } };
  }

  if (req.user?.role === "supplier" && String(order.supplierId) !== String(req.user?.id || "")) {
    return { error: { status: 403, body: { error: "You can only update your own wholesale orders" } } };
  }

  return { order };
};

exports.createWholesaleProduct = async (req, res) => {

  try {

    const product = await WholesaleProduct.create(req.body);

    res.json(product);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};
exports.createWholesaleOrder = async (req, res) => {

  try {

    const order = await WholesaleOrder.create({
      ...req.body,
      statusHistory: [{
        status: req.body?.status || "pending",
        changedAt: new Date(),
        changedBy: req.user?.id || null,
      }],
    });

    const io = req.app.get("io");
    if (io) io.emit("newWholesaleOrder", order);

    res.json({
      message: "Wholesale order placed",
      order
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};
exports.getSupplierOrders = async (req, res) => {

  try {

    const actorId = req.user?.id || null;
    const requestedSupplierId = req.params.supplierId;

    if (req.user?.role === "supplier" && String(actorId) !== String(requestedSupplierId)) {
      return res.status(403).json({ error: "You can only access your own wholesale orders" });
    }

    const orders = await WholesaleOrder.find({
      supplierId: requestedSupplierId
    }).populate("items.productId");

    res.json(orders);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};

exports.updateWholesaleOrderDetails = async (req, res) => {

  try {

    const { order, error } = await resolveWholesaleOrderForActor(req.params.orderId, req);
    if (error) {
      return res.status(error.status).json(error.body);
    }

    const supplierNotes = normalizeText(req.body?.supplierNotes, 1200);
    const cancellationReason = normalizeText(req.body?.cancellationReason, 240);

    if (supplierNotes !== null) {
      order.supplierNotes = supplierNotes;
    }

    if (cancellationReason !== null) {
      order.cancellationReason = cancellationReason;
    }

    await order.save();
    await order.populate("items.productId");

    res.json({
      message: "Wholesale order details updated",
      order,
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};

exports.updateWholesaleFulfillment = async (req, res) => {
  try {
    const { order, error } = await resolveWholesaleOrderForActor(req.params.orderId, req);
    if (error) return res.status(error.status).json(error.body);

    const { fulfilledItems } = req.body || {};

    if (!Array.isArray(fulfilledItems) || fulfilledItems.length === 0) {
      return res.status(400).json({ error: "fulfilledItems array is required" });
    }

    // Build a map of existing fulfilled quantities for merge
    const existingMap = {};
    for (const entry of (order.fulfilledItems || [])) {
      const key = String(entry.productId);
      existingMap[key] = entry;
    }

    // Merge incoming updates
    for (const incoming of fulfilledItems) {
      const productKey = String(incoming.productId);
      if (!productKey) continue;
      const qty = Number(incoming.quantityFulfilled) || 0;
      if (qty < 0) continue;
      existingMap[productKey] = {
        productId: incoming.productId,
        quantityFulfilled: qty,
        fulfilledAt: qty > 0 ? new Date() : null,
      };
    }

    order.fulfilledItems = Object.values(existingMap);

    // Recalculate fulfillmentProgress
    let totalOrdered = 0;
    let totalFulfilled = 0;
    for (const line of (order.items || [])) {
      const ordered = Number(line.quantity) || 0;
      const key = String(line.productId);
      const fulfilled = Number(existingMap[key]?.quantityFulfilled) || 0;
      totalOrdered += ordered;
      totalFulfilled += Math.min(fulfilled, ordered);
    }
    order.fulfillmentProgress = totalOrdered > 0
      ? Math.round((totalFulfilled / totalOrdered) * 100)
      : 0;

    await order.save();
    await order.populate("items.productId");

    res.json({
      message: "Fulfillment progress updated",
      fulfillmentProgress: order.fulfillmentProgress,
      fulfilledItems: order.fulfilledItems,
      order,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateWholesaleInvoice = async (req, res) => {
  try {
    const { order, error } = await resolveWholesaleOrderForActor(req.params.orderId, req);
    if (error) return res.status(error.status).json(error.body);

    const invoiceRef = normalizeText(req.body?.invoiceRef, 80);
    const poNumber = normalizeText(req.body?.poNumber, 80);

    if (invoiceRef !== null) order.invoiceRef = invoiceRef;
    if (poNumber !== null) order.poNumber = poNumber;

    await order.save();

    res.json({
      message: "Invoice metadata updated",
      invoiceRef: order.invoiceRef,
      poNumber: order.poNumber,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getWholesaleOrderInvoice = async (req, res) => {
  try {
    const order = await WholesaleOrder.findById(req.params.orderId)
      .populate("items.productId")
      .populate("retailerId", "name email")
      .populate("supplierId", "name email");

    if (!order) return res.status(404).json({ error: "Wholesale order not found" });

    // Retailer can only see their own orders; supplier sees their own
    if (req.user?.role === "retailer" && String(order.retailerId?._id) !== String(req.user.id)) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (req.user?.role === "supplier" && String(order.supplierId?._id) !== String(req.user.id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const invoicePayload = {
      invoiceRef: order.invoiceRef || null,
      poNumber: order.poNumber || null,
      orderId: order._id,
      orderCode: String(order._id).slice(-8).toUpperCase(),
      createdAt: order.createdAt,
      status: order.status,
      retailer: order.retailerId
        ? { name: order.retailerId.name, email: order.retailerId.email }
        : null,
      supplier: order.supplierId
        ? { name: order.supplierId.name, email: order.supplierId.email }
        : null,
      lineItems: (order.items || []).map((item) => ({
        product: item.productId?.name ?? "Unknown Product",
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: (item.price ?? 0) * (item.quantity ?? 0),
      })),
      totalAmount: order.totalAmount,
      fulfillmentProgress: order.fulfillmentProgress,
      confirmedAt: order.confirmedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason || null,
      supplierNotes: order.supplierNotes || null,
    };

    res.json(invoicePayload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRetailerWholesaleOrders = async (req, res) => {
  try {
    const retailerId = req.user?.id;
    if (!retailerId) return res.status(401).json({ error: "Unauthorized" });

    const orders = await WholesaleOrder.find({ retailerId })
      .populate("items.productId")
      .populate("supplierId", "name email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateWholesaleOrderStatus = async (req, res) => {

  try {

    const { status } = req.body || {};
    const actorId = req.user?.id || null;
    const supplierNotes = normalizeText(req.body?.supplierNotes, 1200);
    const cancellationReason = normalizeText(req.body?.cancellationReason, 240);

    if (!ALLOWED_WHOLESALE_STATUSES.includes(status)) {
      return res.status(400).json({
        error: "Invalid wholesale order status",
        allowedStatuses: ALLOWED_WHOLESALE_STATUSES,
      });
    }

    if (status === "cancelled" && !cancellationReason) {
      return res.status(400).json({ error: "Cancellation reason is required when cancelling a wholesale order" });
    }

    const { order, error } = await resolveWholesaleOrderForActor(req.params.orderId, req);
    if (error) {
      return res.status(error.status).json(error.body);
    }

    if (order.status === status) {
      return res.json({
        message: "Wholesale order already has that status",
        order,
      });
    }

    order.status = status;
    order.lastStatusUpdatedBy = actorId;

    if (supplierNotes !== null) {
      order.supplierNotes = supplierNotes;
    }

    if (status === "cancelled") {
      order.cancellationReason = cancellationReason || order.cancellationReason || "Cancelled by supplier";
    }

    const timestampField = STATUS_TIMESTAMP_FIELD[status];
    if (timestampField && !order[timestampField]) {
      order[timestampField] = new Date();
    }

    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status,
        changedAt: new Date(),
        changedBy: actorId,
      },
    ];

    await order.save();

    await notifyWholesaleStatusChange(order, status);

    await order.populate("items.productId");

    res.json({
      message: "Wholesale order updated",
      order,
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};