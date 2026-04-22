require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const ensureWallet = (user) => {
  if (!user.wallet || typeof user.wallet.balance !== "number") {
    user.wallet = {
      balance: 0,
      lastUpdated: new Date(),
    };
    return true;
  }
  return false;
};

const ensureReferral = (user) => {
  if (!user.referral || typeof user.referral !== "object") {
    user.referral = {
      code: "",
      createdAt: new Date(),
      totalReferrals: 0,
      successfulReferrals: 0,
      totalEarnings: 0,
      tier: "level1",
      referredUsers: [],
    };
    return true;
  }

  let changed = false;
  if (typeof user.referral.totalReferrals !== "number") {
    user.referral.totalReferrals = 0;
    changed = true;
  }
  if (typeof user.referral.successfulReferrals !== "number") {
    user.referral.successfulReferrals = 0;
    changed = true;
  }
  if (typeof user.referral.totalEarnings !== "number") {
    user.referral.totalEarnings = 0;
    changed = true;
  }
  if (!user.referral.tier) {
    user.referral.tier = "level1";
    changed = true;
  }
  if (!Array.isArray(user.referral.referredUsers)) {
    user.referral.referredUsers = [];
    changed = true;
  }
  return changed;
};

const ensureLoyalty = (user) => {
  if (!user.loyalty || typeof user.loyalty !== "object") {
    user.loyalty = {
      totalPoints: 0,
      pointsBalance: 0,
      pointsRedeemed: 0,
      tier: "bronze",
      createdAt: new Date(),
      lastTierUpdateAt: new Date(),
      transactions: [],
      redemptions: [],
    };
    return true;
  }

  let changed = false;
  if (typeof user.loyalty.totalPoints !== "number") {
    user.loyalty.totalPoints = 0;
    changed = true;
  }
  if (typeof user.loyalty.pointsBalance !== "number") {
    user.loyalty.pointsBalance = 0;
    changed = true;
  }
  if (typeof user.loyalty.pointsRedeemed !== "number") {
    user.loyalty.pointsRedeemed = 0;
    changed = true;
  }
  if (!user.loyalty.tier) {
    user.loyalty.tier = "bronze";
    changed = true;
  }
  if (!Array.isArray(user.loyalty.transactions)) {
    user.loyalty.transactions = [];
    changed = true;
  }
  if (!Array.isArray(user.loyalty.redemptions)) {
    user.loyalty.redemptions = [];
    changed = true;
  }
  return changed;
};

const ensureWishlist = (user) => {
  if (!Array.isArray(user.wishlist)) {
    user.wishlist = [];
    return true;
  }
  return false;
};

const ensureShareableWishlists = (user) => {
  if (!Array.isArray(user.shareableWishlists)) {
    user.shareableWishlists = [];
    return true;
  }
  return false;
};

const ensureSubscription = (user) => {
  if (!user.subscription || typeof user.subscription !== "object") {
    user.subscription = {
      planId: "free",
      isActive: false,
      autoRenew: false,
      startDate: null,
      endDate: null,
      renewalDate: null,
      pausedAt: null,
      cancelledAt: null,
      cancellationReason: "",
    };
    return true;
  }

  let changed = false;
  if (!user.subscription.planId) {
    user.subscription.planId = "free";
    changed = true;
  }
  if (typeof user.subscription.isActive !== "boolean") {
    user.subscription.isActive = false;
    changed = true;
  }
  if (typeof user.subscription.autoRenew !== "boolean") {
    user.subscription.autoRenew = false;
    changed = true;
  }
  return changed;
};

const ensureReferralMeta = (user) => {
  let changed = false;
  if (user.referredBy === undefined) {
    user.referredBy = null;
    changed = true;
  }
  if (!user.referralStatus) {
    user.referralStatus = "inactive";
    changed = true;
  }
  return changed;
};

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(mongoUri);
  console.log("[migrateUserProfiles] Mongo connected");

  const users = await User.find({});
  let updatedCount = 0;

  for (const user of users) {
    const changed = [
      ensureWallet(user),
      ensureWishlist(user),
      ensureShareableWishlists(user),
      ensureReferral(user),
      ensureReferralMeta(user),
      ensureLoyalty(user),
      ensureSubscription(user),
    ].some(Boolean);

    if (changed) {
      await user.save();
      updatedCount += 1;
    }
  }

  console.log(`[migrateUserProfiles] Processed ${users.length} users, updated ${updatedCount}`);
  await mongoose.disconnect();
  console.log("[migrateUserProfiles] Done");
};

run().catch(async (error) => {
  console.error("[migrateUserProfiles] Failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // noop
  }
  process.exit(1);
});
