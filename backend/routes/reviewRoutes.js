const express = require("express")
const router = express.Router()
const { protect } = require("../middleware/authMiddleware")
const {
  createReview,
  getReviews,
  updateReview,
  deleteReview,
  replyToReview,
  getMyReviews,
  getVendorReviews,
} = require("../controllers/reviewController")

// Public — optionally authenticated (for myReviewId flag)
router.get("/:targetType/:targetId", (req, res, next) => {
  // Attach user if token present, but don't block if missing
  const auth = require("../middleware/authMiddleware")
  auth.optionalProtect(req, res, next)
}, getReviews)

// Authenticated
router.use(protect)
router.post("/", createReview)
router.get("/my/reviews", getMyReviews)
router.patch("/:id", updateReview)
router.delete("/:id", deleteReview)
router.patch("/:id/reply", replyToReview)

// Vendor
router.get("/vendor/:storeId", getVendorReviews)

module.exports = router
