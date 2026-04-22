/**
 * Migration: Normalize legacy wholesale order statuses
 *
 * Maps non-canonical status values to their canonical equivalents:
 *   dispatched  → shipped
 *   processing  → confirmed
 *   complete    → delivered
 *   canceled    → cancelled  (common misspelling)
 *
 * Run once against the live DB:
 *   node backend/scripts/migrateWholesaleStatuses.js
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const WholesaleOrder = require("../models/WholesaleOrder");

const STATUS_MAP = {
  dispatched:  "shipped",
  processing:  "confirmed",
  complete:    "delivered",
  canceled:    "cancelled",
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("[migrate] Connected to MongoDB");

  let totalMigrated = 0;

  for (const [legacy, canonical] of Object.entries(STATUS_MAP)) {
    const result = await WholesaleOrder.updateMany(
      { status: legacy },
      [

        {
          $set: {
            status: canonical,
            // Append a statusHistory entry for audit trail
            statusHistory: {
              $concatArrays: [
                "$statusHistory",
                [{
                  status: canonical,
                  changedAt: new Date(),
                  changedBy: null,
                }],
              ],
            },
            // Set the relevant lifecycle timestamp if not already set
            shippedAt: {
              $cond: [
                { $and: [{ $eq: [canonical, "shipped"] }, { $eq: ["$shippedAt", null] }] },
                new Date(),
                "$shippedAt",
              ],
            },
            deliveredAt: {
              $cond: [
                { $and: [{ $eq: [canonical, "delivered"] }, { $eq: ["$deliveredAt", null] }] },
                new Date(),
                "$deliveredAt",
              ],
            },
            cancelledAt: {
              $cond: [
                { $and: [{ $eq: [canonical, "cancelled"] }, { $eq: ["$cancelledAt", null] }] },
                new Date(),
                "$cancelledAt",
              ],
            },
          },
        },
      ],
      { updatePipeline: true }
    );

    if (result.modifiedCount > 0) {
      console.log(`[migrate] ${legacy} → ${canonical}: ${result.modifiedCount} order(s) updated`);
      totalMigrated += result.modifiedCount;
    } else {
      console.log(`[migrate] ${legacy} → ${canonical}: no orders found`);
    }
  }

  console.log(`[migrate] Done. Total orders migrated: ${totalMigrated}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("[migrate] Fatal error:", err);
  process.exit(1);
});
