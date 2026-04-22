const Review = require("../models/Review")
const Order = require("../models/Order")

/* ── helpers ─────────────────────────────────────────── */
async function getStats(targetType, targetId) {
  const agg = await Review.aggregate([
    { $match: { targetType, targetId: new (require("mongoose").Types.ObjectId)(targetId) } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
        dist: {
          $push: "$rating",
        },
      },
    },
  ])
  if (!agg.length) return { avgRating: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
  const { avgRating, count, dist } = agg[0]
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  dist.forEach((r) => { distribution[r] = (distribution[r] || 0) + 1 })
  return { avgRating: Math.round(avgRating * 10) / 10, count, distribution }
}

/* ── POST /api/reviews ───────────────────────────────── */
exports.createReview = async (req, res) => {
  try {
    const { targetType, targetId, rating, comment, orderId } = req.body
    if (!["product", "store"].includes(targetType)) {
      return res.status(400).json({ message: "targetType must be product or store" })
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be 1–5" })
    }

    // Verify purchase if orderId provided
    let isVerifiedPurchase = false
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        userId: req.user.id,
        status: "delivered",
      })
      if (order) isVerifiedPurchase = true
    }

    const review = await Review.create({
      userId: req.user.id,
      targetType,
      targetId,
      orderId: orderId || null,
      rating,
      comment: comment || "",
      isVerifiedPurchase,
    })

    const populated = await Review.findById(review._id).populate("userId", "name")
    res.status(201).json(populated)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "You have already reviewed this item" })
    }
    res.status(500).json({ message: err.message })
  }
}

/* ── GET /api/reviews/:targetType/:targetId ──────────── */
exports.getReviews = async (req, res) => {
  try {
    const { targetType, targetId } = req.params
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, parseInt(req.query.limit) || 10)
    const sort = req.query.sort === "rating" ? { rating: -1 } : { createdAt: -1 }

    const [reviews, stats] = await Promise.all([
      Review.find({ targetType, targetId })
        .populate("userId", "name")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      getStats(targetType, targetId),
    ])

    // Attach caller's own review flag
    const myReviewId = req.user
      ? reviews.find((r) => String(r.userId?._id) === String(req.user.id))?._id
      : null

    res.json({ reviews, stats, page, myReviewId })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/* ── PATCH /api/reviews/:id ──────────────────────────── */
exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, userId: req.user.id })
    if (!review) return res.status(404).json({ message: "Review not found" })

    const { rating, comment } = req.body
    if (rating) review.rating = rating
    if (comment !== undefined) review.comment = comment
    await review.save()

    const populated = await Review.findById(review._id).populate("userId", "name")
    res.json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/* ── DELETE /api/reviews/:id ─────────────────────────── */
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    if (!review) return res.status(404).json({ message: "Review not found" })
    res.json({ message: "Review deleted" })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/* ── PATCH /api/reviews/:id/reply  (vendor) ──────────── */
exports.replyToReview = async (req, res) => {
  try {
    const { text } = req.body
    if (!text || !text.trim()) return res.status(400).json({ message: "Reply text required" })

    const review = await Review.findById(req.params.id)
    if (!review) return res.status(404).json({ message: "Review not found" })

    review.vendorReply = { text: text.trim(), repliedAt: new Date() }
    await review.save()
    const populated = await Review.findById(review._id).populate("userId", "name")
    res.json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/* ── GET /api/reviews/my ─────────────────────────────── */
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean()
    res.json(reviews)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/* ── GET /api/reviews/vendor/:storeId ────────────────── */
exports.getVendorReviews = async (req, res) => {
  try {
    const { storeId } = req.params
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, parseInt(req.query.limit) || 20)
    const ratingFilter = req.query.rating ? { rating: parseInt(req.query.rating) } : {}

    const [storeReviews, productReviews, storeStats] = await Promise.all([
      Review.find({ targetType: "store", targetId: storeId, ...ratingFilter })
        .populate("userId", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.find({ targetType: "product", ...ratingFilter })
        .populate("userId", "name")
        .populate("targetId", "name storeId")
        .sort({ createdAt: -1 })
        .lean()
        .then(reviews => reviews.filter(r => String(r.targetId?.storeId) === storeId)),
      getStats("store", storeId),
    ])

    res.json({ storeReviews, productReviews, storeStats })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
