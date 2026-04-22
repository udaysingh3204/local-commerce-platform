const Address = require("../models/Address")

/* GET /api/addresses */
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user.id }).sort({ isDefault: -1, createdAt: -1 })
    res.json(addresses)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/* POST /api/addresses */
exports.createAddress = async (req, res) => {
  try {
    const { label, fullName, phone, line1, line2, city, state, pincode, lat, lng, isDefault } = req.body

    if (!fullName || !phone || !line1 || !city || !state || !pincode) {
      return res.status(400).json({ message: "fullName, phone, line1, city, state and pincode are required" })
    }

    // Limit 10 addresses per user
    const count = await Address.countDocuments({ userId: req.user.id })
    if (count >= 10) return res.status(400).json({ message: "Maximum 10 saved addresses reached" })

    // If setting as default, unset any existing default first
    if (isDefault) {
      await Address.updateMany({ userId: req.user.id }, { isDefault: false })
    }

    const address = await Address.create({
      userId: req.user.id,
      label: label || "home",
      fullName, phone, line1, line2: line2 || "", city, state, pincode,
      lat: lat || null, lng: lng || null,
      isDefault: Boolean(isDefault),
    })

    res.status(201).json(address)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/* PATCH /api/addresses/:id */
exports.updateAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user.id })
    if (!address) return res.status(404).json({ message: "Address not found" })

    const fields = ["label", "fullName", "phone", "line1", "line2", "city", "state", "pincode", "lat", "lng"]
    fields.forEach(f => { if (req.body[f] !== undefined) address[f] = req.body[f] })

    if (req.body.isDefault) {
      await Address.updateMany({ userId: req.user.id, _id: { $ne: address._id } }, { isDefault: false })
      address.isDefault = true
    }

    await address.save()
    res.json(address)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/* DELETE /api/addresses/:id */
exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    if (!address) return res.status(404).json({ message: "Address not found" })
    res.json({ message: "Address deleted" })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/* PATCH /api/addresses/:id/default */
exports.setDefault = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user.id })
    if (!address) return res.status(404).json({ message: "Address not found" })
    await Address.updateMany({ userId: req.user.id }, { isDefault: false })
    address.isDefault = true
    await address.save()
    res.json(address)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
