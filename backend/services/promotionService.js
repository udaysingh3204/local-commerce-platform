const mongoose = require("mongoose");
const Promotion = require("../models/Promotion");
const PromotionRedemption = require("../models/PromotionRedemption");

class PromotionService {
  constructor() {
    this.campaignCache = new Map();
    this.cacheTTL = 10 * 60 * 1000;
  }

  async createCampaign(config) {
    const validFrom = new Date(config.validFrom);
    const validTo = new Date(config.validTo);

    if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validTo.getTime())) {
      throw new Error("Invalid campaign dates");
    }

    if (validTo <= validFrom) {
      throw new Error("End date must be after start date");
    }

    const campaignId = this.generateCampaignId();
    const couponCode = await this.resolveUniqueCode(config.code, config.name);

    const campaign = await Promotion.create({
      id: campaignId,
      code: couponCode,
      name: config.name,
      type: config.type,
      target: config.target || {},
      discount: config.discount || {},
      validFrom,
      validTo,
      maxUsagePerUser: Number(config.maxUsagePerUser || 5),
      totalBudget: config.totalBudget ?? null,
      metadata: config.metadata || {},
      status: "active",
    });

    this.invalidateCache();

    return {
      campaignId,
      ...this.enrichCampaign(campaign.toObject()),
      message: "Campaign created successfully",
    };
  }

  async getApplicablePromotions(context) {
    const cacheKey = `promo_${context.userId || "guest"}`;
    const cached = this.campaignCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return this.serializeApplicablePromotions(this.filterApplicable(cached.campaigns, context), context.userId);
    }

    const now = new Date();
    const activeCampaigns = await Promotion.find({
      status: "active",
      validFrom: { $lte: now },
      validTo: { $gte: now },
      $or: [{ totalBudget: null }, { $expr: { $lt: ["$currentSpend", "$totalBudget"] } }],
    }).lean();
    const enrichedCampaigns = activeCampaigns.map((campaign) => this.enrichCampaign(campaign));

    this.campaignCache.set(cacheKey, {
      campaigns: enrichedCampaigns,
      timestamp: Date.now(),
    });

    const applicable = this.filterApplicable(enrichedCampaigns, context);

    return this.serializeApplicablePromotions(applicable, context.userId);
  }

  async serializeApplicablePromotions(applicable, userId) {
    if (!userId || applicable.length === 0) {
      return applicable.map((campaign) => this.toApplicablePromotionPayload(campaign, 0));
    }

    const campaignIds = applicable.map((campaign) => String(campaign.campaignId || campaign.id || campaign._id));
    const usageMap = await this.getUsageMap(campaignIds, userId);

    return applicable
      .filter((campaign) => {
        const campaignId = String(campaign.campaignId || campaign.id || campaign._id);
        const usedCount = Number(usageMap.get(campaignId) || 0);
        return campaign.maxUsagePerUser <= 0 || usedCount < campaign.maxUsagePerUser;
      })
      .map((campaign) => {
        const campaignId = String(campaign.campaignId || campaign.id || campaign._id);
        const usedCount = Number(usageMap.get(campaignId) || 0);
        return this.toApplicablePromotionPayload(campaign, usedCount);
      });
  }

  toApplicablePromotionPayload(campaign, usedCount) {
    const campaignId = String(campaign.campaignId || campaign.id || campaign._id);
    const metadata = campaign.metadata ? JSON.parse(JSON.stringify(campaign.metadata)) : {};
    const maxUsagePerUser = Number(campaign.maxUsagePerUser || 0);

    return {
      campaignId,
      code: campaign.code,
      name: campaign.name,
      type: campaign.type,
      discount: campaign.discount,
      metadata,
      daysRemaining: Number.isFinite(campaign.daysRemaining) ? campaign.daysRemaining : this.enrichCampaign(campaign).daysRemaining,
      budgetProgress: Number.isFinite(campaign.budgetProgress) ? campaign.budgetProgress : this.enrichCampaign(campaign).budgetProgress,
      usedCount,
      maxUsagePerUser,
      remainingUses: maxUsagePerUser > 0 ? Math.max(maxUsagePerUser - usedCount, 0) : null,
    };
  }

  async getCampaignByCode(code) {
    const normalized = this.normalizeCode(code);
    if (!normalized) return null;

    const campaign = await Promotion.findOne({ code: normalized });
    if (!campaign) return null;

    return this.enrichCampaign(campaign.toObject());
  }

  async getCampaignByCodeForUser(code, userId) {
    const campaign = await Promotion.findOne({ code: this.normalizeCode(code) });
    if (!campaign) return null;

    const details = this.enrichCampaign(campaign.toObject());
    const usedCount = userId ? await this.getUserUsage(campaign.id, userId) : 0;

    return {
      ...details,
      usedCount,
      remainingUses: campaign.maxUsagePerUser > 0 ? Math.max(campaign.maxUsagePerUser - usedCount, 0) : null,
    };
  }

  async applyCouponCode(code, order, userId) {
    const campaign = await Promotion.findOne({ code: this.normalizeCode(code) });
    if (!campaign) {
      throw new Error("Coupon code not found");
    }

    return this.applyPromotion(campaign.id, order, userId);
  }

  async applyPromotion(campaignId, order, userId) {
    const campaign = await this.findCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found");

    if (!userId) {
      throw new Error("Authenticated user is required to apply a promotion");
    }

    const now = new Date();
    if (campaign.validFrom > now || campaign.validTo < now || campaign.status !== "active") {
      throw new Error("Campaign is not active");
    }

    if (campaign.totalBudget && campaign.currentSpend >= campaign.totalBudget) {
      throw new Error("Campaign budget exhausted");
    }

    const currentUserUsage = await this.getUserUsage(campaign.id, userId);
    if (campaign.maxUsagePerUser > 0 && currentUserUsage >= campaign.maxUsagePerUser) {
      throw new Error("You have reached the usage limit for this coupon");
    }

    const subtotal = Number(order.subtotal || 0);
    const items = Array.isArray(order.items) ? order.items : [];

    let discountAmount = 0;
    let discountPercent = 0;

    if (campaign.type === "percentage") {
      discountPercent = Number(campaign.discount?.percentage || 0);
      discountAmount = Math.floor((subtotal * discountPercent) / 100);
    } else if (campaign.type === "flat") {
      discountAmount = Number(campaign.discount?.flatAmount || 0);
    } else if (campaign.type === "bogo") {
      const prices = items
        .map((item) => Number(item.price || 0) * Number(item.quantity || 0))
        .sort((a, b) => a - b);
      discountAmount = prices[0] || 0;
    } else if (campaign.type === "tiered") {
      const tiers = Array.isArray(campaign.discount?.tiers) ? campaign.discount.tiers : [];
      const applicableTier = [...tiers]
        .filter((tier) => subtotal >= Number(tier.minAmount || 0))
        .sort((a, b) => Number(b.minAmount || 0) - Number(a.minAmount || 0))[0];

      if (applicableTier) {
        if (applicableTier.type === "percentage") {
          discountPercent = Number(applicableTier.value || 0);
          discountAmount = Math.floor((subtotal * discountPercent) / 100);
        } else {
          discountAmount = Number(applicableTier.value || 0);
        }
      }
    }

    const maxDiscount = Number(campaign.discount?.maxDiscount || 0);
    if (maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, maxDiscount);
    }

    campaign.usageCount += 1;
    campaign.currentSpend += discountAmount;
    campaign.performance = campaign.performance || {};
    campaign.performance.conversions = Number(campaign.performance.conversions || 0) + 1;
    campaign.performance.totalRevenue = Number(campaign.performance.totalRevenue || 0) + (subtotal - discountAmount);
    campaign.performance.avgOrderValue =
      campaign.performance.conversions > 0
        ? campaign.performance.totalRevenue / campaign.performance.conversions
        : 0;

    if (campaign.totalBudget && campaign.currentSpend >= campaign.totalBudget) {
      campaign.status = "paused";
    }

    await campaign.save();
    await PromotionRedemption.findOneAndUpdate(
      { campaignId: campaign.id, userId: String(userId) },
      {
        $inc: {
          usageCount: 1,
          totalSavings: discountAmount,
        },
        $set: {
          lastUsedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    this.invalidateCache();

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      couponCode: campaign.code || null,
      discountAmount,
      discountPercent,
      discountType: campaign.type,
      finalAmount: Math.max(subtotal - discountAmount, 0),
      maxUsagePerUser: campaign.maxUsagePerUser,
      usedCount: currentUserUsage + 1,
      remainingUses: campaign.maxUsagePerUser > 0 ? Math.max(campaign.maxUsagePerUser - (currentUserUsage + 1), 0) : null,
      message: `Promotion applied! Saved INR ${discountAmount}`,
    };
  }

  async getCampaign(campaignId) {
    const campaign = await this.findCampaign(campaignId);
    if (!campaign) return null;
    return this.enrichCampaign(campaign.toObject());
  }

  async getAllCampaigns(filters = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.active) {
      const now = new Date();
      query.status = "active";
      query.validFrom = { $lte: now };
      query.validTo = { $gte: now };
    }

    const campaigns = await Promotion.find(query).sort({ createdAt: -1 }).lean();
    return campaigns.map((campaign) => this.enrichCampaign(campaign));
  }

  async updateCampaign(campaignId, updates) {
    const campaign = await this.findCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found");

    if (updates.name) campaign.name = updates.name;
    if (updates.type) campaign.type = updates.type;
    if (updates.status) campaign.status = updates.status;
    if (updates.validFrom) campaign.validFrom = new Date(updates.validFrom);
    if (updates.validTo) campaign.validTo = new Date(updates.validTo);
    if (updates.discount) campaign.discount = { ...(campaign.discount || {}), ...updates.discount };
    if (updates.metadata) campaign.metadata = { ...(campaign.metadata || {}), ...updates.metadata };
    if (Object.prototype.hasOwnProperty.call(updates, "maxUsagePerUser")) {
      campaign.maxUsagePerUser = Number(updates.maxUsagePerUser || 0);
    }
    if (Object.prototype.hasOwnProperty.call(updates, "totalBudget")) {
      campaign.totalBudget = updates.totalBudget ?? null;
    }

    if (updates.code) {
      const nextCode = this.normalizeCode(updates.code);
      if (!nextCode) {
        throw new Error("Invalid coupon code");
      }

      if (nextCode !== campaign.code) {
        const existing = await Promotion.findOne({ code: nextCode, id: { $ne: campaign.id } }).lean();
        if (existing) {
          throw new Error("Coupon code already exists");
        }
      }

      campaign.code = nextCode;
    }

    await campaign.save();
    this.invalidateCache();

    return this.enrichCampaign(campaign.toObject());
  }

  async toggleCampaignStatus(campaignId, status) {
    const campaign = await this.findCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found");

    campaign.status = status;
    await campaign.save();
    this.invalidateCache();

    return this.enrichCampaign(campaign.toObject());
  }

  async getCampaignMetrics(campaignId) {
    const campaign = await this.findCampaign(campaignId);
    if (!campaign) return null;

    const impressions = Number(campaign.performance?.impressions || 0);
    const clicks = Number(campaign.performance?.clicks || 0);
    const conversions = Number(campaign.performance?.conversions || 0);
    const totalRevenue = Number(campaign.performance?.totalRevenue || 0);
    const avgOrderValue = Number(campaign.performance?.avgOrderValue || 0);

    const conversionRate = impressions > 0 ? Number(((conversions / impressions) * 100).toFixed(2)) : 0;
    const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
    const totalDiscount = Number(campaign.currentSpend || 0);
    const roi = totalDiscount > 0 ? Number(((totalRevenue / totalDiscount) * 100).toFixed(2)) : 0;

    return {
      campaignId: campaign.id,
      code: campaign.code,
      name: campaign.name,
      impressions,
      clicks,
      conversions,
      conversionRate,
      ctr,
      totalRevenue,
      avgOrderValue: Number(avgOrderValue.toFixed(2)),
      totalDiscount,
      usageCount: Number(campaign.usageCount || 0),
      roi,
    };
  }

  async deleteCampaign(campaignId) {
    const campaign = await this.findCampaign(campaignId);
    if (!campaign) return false;

    await Promotion.deleteOne({ _id: campaign._id });
    await PromotionRedemption.deleteMany({ campaignId: campaign.id });
    this.invalidateCache();
    return true;
  }

  async findCampaign(campaignId) {
    const query = [{ id: campaignId }];
    if (mongoose.Types.ObjectId.isValid(campaignId)) {
      query.push({ _id: campaignId });
    }
    return Promotion.findOne({ $or: query });
  }

  async getUserUsage(campaignId, userId) {
    const redemption = await PromotionRedemption.findOne({ campaignId, userId: String(userId) }).lean();
    return Number(redemption?.usageCount || 0);
  }

  async getUsageMap(campaignIds, userId) {
    const redemptions = await PromotionRedemption.find({
      campaignId: { $in: campaignIds },
      userId: String(userId),
    }).lean();

    const usageMap = new Map();
    for (const redemption of redemptions) {
      usageMap.set(redemption.campaignId, Number(redemption.usageCount || 0));
    }
    return usageMap;
  }

  enrichCampaign(campaign) {
    const now = new Date();
    const validTo = new Date(campaign.validTo);
    const validFrom = new Date(campaign.validFrom);
    const daysRemaining = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const totalBudget = Number(campaign.totalBudget || 0);
    const currentSpend = Number(campaign.currentSpend || 0);
    const budgetProgress = totalBudget > 0 ? Math.round((currentSpend / totalBudget) * 100) : 0;

    return {
      ...campaign,
      campaignId: String(campaign.campaignId || campaign.id || campaign._id),
      metadata: campaign.metadata ? JSON.parse(JSON.stringify(campaign.metadata)) : {},
      daysRemaining: Math.max(daysRemaining, 0),
      budgetProgress,
      isActive: campaign.status === "active" && validFrom <= now && validTo >= now,
    };
  }

  generateCampaignId() {
    return `camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  normalizeCode(code) {
    if (!code || typeof code !== "string") return null;
    const normalized = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().trim();
    return normalized || null;
  }

  async resolveUniqueCode(code, name) {
    const explicit = this.normalizeCode(code);
    if (explicit) {
      const exists = await Promotion.findOne({ code: explicit }).lean();
      if (exists) {
        throw new Error("Coupon code already exists");
      }
      return explicit;
    }

    const base = this.normalizeCode((name || "SAVE").slice(0, 8)) || "SAVE";
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const candidate = `${base}${suffix}`.slice(0, 12);
      const exists = await Promotion.findOne({ code: candidate }).lean();
      if (!exists) {
        return candidate;
      }
    }

    return null;
  }

  filterApplicable(campaigns, context) {
    return campaigns
      .filter((campaign) => {
        const target = campaign.target || {};

        if (context.totalAmount < Number(target.minOrder || 0) || context.totalAmount > Number(target.maxOrder || 999999)) {
          return false;
        }

        if (Array.isArray(target.productIds) && target.productIds.length > 0) {
          const hasMatchingProduct = (context.products || []).some((product) =>
            target.productIds.includes(product.productId)
          );
          if (!hasMatchingProduct) return false;
        }

        if (Array.isArray(target.categoryIds) && target.categoryIds.length > 0) {
          const hasMatchingCategory = (context.products || []).some((product) =>
            target.categoryIds.includes(product.category)
          );
          if (!hasMatchingCategory) return false;
        }

        if (Array.isArray(target.storeIds) && target.storeIds.length > 0) {
          if (!target.storeIds.includes(context.storeId)) {
            return false;
          }
        }

        return true;
      })
      .map((campaign) => ({
        ...campaign,
        campaignId: String(campaign.campaignId || campaign.id || campaign._id),
        code: campaign.code || null,
        discount: campaign.discount || {},
        metadata: campaign.metadata ? JSON.parse(JSON.stringify(campaign.metadata)) : {},
        maxUsagePerUser: Number(campaign.maxUsagePerUser || 0),
      }));
  }

  invalidateCache() {
    this.campaignCache.clear();
  }
}

module.exports = new PromotionService();
