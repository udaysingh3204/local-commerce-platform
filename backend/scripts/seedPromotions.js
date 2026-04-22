require("dotenv").config();
const mongoose = require("mongoose");
const Promotion = require("../models/Promotion");

const campaigns = [
  {
    id: "camp_launch_saver10",
    code: "WELCOME10",
    name: "Launch Saver 10%",
    type: "percentage",
    target: {
      minOrder: 199,
      maxOrder: 999999,
      productIds: [],
      categoryIds: [],
      storeIds: [],
    },
    discount: {
      percentage: 10,
      maxDiscount: 150,
    },
    maxUsagePerUser: 3,
    totalBudget: 150000,
    status: "active",
    metadata: {
      source: "seed",
      audience: "all",
      vibe: "launch frenzy",
      quiz: {
        prompt: "Type the audience tag for this launch campaign.",
        answer: "all",
      },
    },
  },
  {
    id: "camp_free_delivery_flat30",
    code: "FLAT30",
    name: "Flat 30 Off",
    type: "flat",
    target: {
      minOrder: 299,
      maxOrder: 999999,
      productIds: [],
      categoryIds: [],
      storeIds: [],
    },
    discount: {
      flatAmount: 30,
      maxDiscount: 30,
    },
    maxUsagePerUser: 5,
    totalBudget: 120000,
    status: "active",
    metadata: {
      source: "seed",
      audience: "growth",
      vibe: "snack money",
      quiz: {
        prompt: "This flat discount campaign targets which audience tag?",
        answer: "growth",
      },
    },
  },
  {
    id: "camp_high_value_12",
    code: "SAVE12",
    name: "High Value 12%",
    type: "percentage",
    target: {
      minOrder: 499,
      maxOrder: 999999,
      productIds: [],
      categoryIds: [],
      storeIds: [],
    },
    discount: {
      percentage: 12,
      maxDiscount: 220,
    },
    maxUsagePerUser: 2,
    totalBudget: 100000,
    status: "active",
    metadata: {
      source: "seed",
      audience: "high_value",
      vibe: "big basket energy",
      quiz: {
        prompt: "Reply with the audience tag tied to this high-value offer.",
        answer: "high value",
      },
    },
  },
];

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(mongoUri);
  console.log("[seedPromotions] Mongo connected");

  const now = new Date();
  const validFrom = new Date(now.getTime() - 10 * 60 * 1000);
  const validTo = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  let created = 0;
  let updated = 0;

  for (const campaign of campaigns) {
    const existing = await Promotion.findOne({ code: campaign.code });
    if (!existing) {
      await Promotion.create({
        ...campaign,
        validFrom,
        validTo,
        currentSpend: 0,
        usageCount: 0,
        performance: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
        },
      });
      created += 1;
      continue;
    }

    existing.name = campaign.name;
    existing.type = campaign.type;
    existing.target = campaign.target;
    existing.discount = campaign.discount;
    existing.maxUsagePerUser = campaign.maxUsagePerUser;
    existing.totalBudget = campaign.totalBudget;
    existing.status = campaign.status;
    existing.metadata = campaign.metadata;
    existing.validFrom = existing.validFrom || validFrom;
    existing.validTo = existing.validTo || validTo;
    await existing.save();
    updated += 1;
  }

  console.log(`[seedPromotions] created=${created} updated=${updated}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("[seedPromotions] Failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // noop
  }
  process.exit(1);
});
