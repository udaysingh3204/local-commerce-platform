const Store = require("../models/Store")

exports.createStore = async (req, res) => {

  try {

    const store = await Store.create(req.body)

    res.status(201).json({
      message: "Store created successfully",
      store
    })

  } catch (error) {

    res.status(500).json({
      error: error.message
    })

  }

}



exports.getStores = async (req, res) => {

  try {

    const stores = await Store.find()

    res.json(stores)

  } catch (error) {

    res.status(500).json({
      error: error.message
    })

  }

}



exports.getVendorStores = async (req, res) => {

  try {

    const stores = await Store.find({
      vendorId: req.params.vendorId
    })

    res.json(stores)

  } catch (error) {

    res.status(500).json({
      error: error.message
    })

  }

}



/* NEARBY STORES */

exports.getNearbyStores = async (req, res) => {
  try {
    const latNum = parseFloat(req.query.lat);
    const lngNum = parseFloat(req.query.lng);
    const radiusNum = parseFloat(req.query.radius) || 5;

    if (isNaN(latNum) || isNaN(lngNum)) {
  return res.status(400).json({
    message: "Latitude and longitude required"
  });
}

    const stores = await Store.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lngNum, latNum]
          },
          $maxDistance: radiusNum * 1000
        }
      }
    });

    res.json(stores);

  } catch (error) {
    console.error("Nearby store error:", error);
    res.status(500).json({
      error: error.message
    });
  }
};