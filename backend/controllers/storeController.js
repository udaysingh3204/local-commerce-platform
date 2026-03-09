const Store = require("../models/Store");

exports.createStore = async (req, res) => {
  try {
    const store = await Store.create(req.body);

    res.status(201).json({
      message: "Store created successfully",
      store
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStores = async (req, res) => {
  try {
    const stores = await Store.find();
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVendorStores = async (req, res) => {

  try {

    const stores = await Store.find({
      vendorId: req.params.vendorId
    });

    res.json(stores);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};
exports.getNearbyStores = async (req, res) => {

  try {

    const { lat, lng, radius } = req.query;

    const stores = await Store.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000
        }
      }
    });

    res.json(stores);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};