const GrowthLead = require("../models/GrowthLead");

const normalizeInterests = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 6);
};

exports.captureLead = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      city,
      useCase,
      source,
      referralCode,
      referredBy,
      interests,
      notes,
      metadata,
    } = req.body || {};

    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: "A valid email is required." });
    }

    const normalizedSource = String(source || "homepage").trim().slice(0, 80) || "homepage";
    const normalizedUseCase = String(useCase || "waitlist").trim().slice(0, 80) || "waitlist";
    const normalizedInterests = normalizeInterests(interests);

    const update = {
      name: String(name || "").trim().slice(0, 120),
      email: normalizedEmail,
      phone: String(phone || "").trim().slice(0, 30),
      city: String(city || "Noida").trim().slice(0, 80) || "Noida",
      useCase: normalizedUseCase,
      source: normalizedSource,
      referralCode: String(referralCode || "").trim().toUpperCase().slice(0, 40),
      referredBy: String(referredBy || "").trim().toUpperCase().slice(0, 40),
      interests: normalizedInterests,
      notes: String(notes || "").trim().slice(0, 300),
      metadata: typeof metadata === "object" && metadata !== null ? metadata : {},
    };

    const lead = await GrowthLead.findOneAndUpdate(
      { email: normalizedEmail, source: normalizedSource },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      ok: true,
      lead,
      message: "Lead captured successfully.",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: "This email is already registered for this campaign." });
    }

    return res.status(500).json({ error: error.message || "Unable to capture lead." });
  }
};

exports.listLeads = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const q = String(req.query.q || "").trim();
    const useCase = String(req.query.useCase || "all").trim();
    const source = String(req.query.source || "all").trim();

    const filter = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { referralCode: { $regex: q, $options: "i" } },
      ];
    }

    if (useCase !== "all") {
      filter.useCase = useCase;
    }

    if (source !== "all") {
      filter.source = source;
    }

    const [leads, totals, useCases, sources] = await Promise.all([
      GrowthLead.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      GrowthLead.countDocuments(filter),
      GrowthLead.distinct("useCase"),
      GrowthLead.distinct("source"),
    ]);

    return res.json({
      total: totals,
      leads,
      filters: {
        useCases: useCases.filter(Boolean).sort(),
        sources: sources.filter(Boolean).sort(),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to load leads." });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const updates = {};
    const { status, ownerNote } = req.body || {};

    if (typeof status === "string") {
      updates.status = status;
    }

    if (typeof ownerNote === "string") {
      updates.ownerNote = ownerNote.trim().slice(0, 300);
    }

    const lead = await GrowthLead.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).lean();

    if (!lead) {
      return res.status(404).json({ error: "Lead not found." });
    }

    return res.json({ ok: true, lead });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to update lead." });
  }
};