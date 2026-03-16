const DeliveryPartner = require("../models/DeliveryPartner");
const User = require("../models/User");
const Order = require("../models/Order");


/* REGISTER DELIVERY PARTNER */

exports.registerDeliveryPartner = async (req, res) => {

  try {

    const partner = await DeliveryPartner.create(req.body);

    res.json({
      message: "Delivery partner registered",
      partner
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};



/* MANUAL DELIVERY ASSIGNMENT */

exports.assignDelivery = async (req, res) => {

  try {

    const { orderId, deliveryPartnerId } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        deliveryPartnerId,
        status: "out_for_delivery"
      },
      { returnDocument: "after" }
    );

    await User.findByIdAndUpdate(
      deliveryPartnerId,
      { isAvailable: false }
    );

    res.json({
      message: "Delivery partner assigned",
      order
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};



/* GET DELIVERY ORDERS */

exports.getAssignedOrders = async (req, res) => {

  try {

    const orders = await Order.find({
      deliveryPartnerId: req.params.partnerId
    })
    .populate("items.productId")
    .sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};



/* UPDATE DELIVERY PARTNER LOCATION */

exports.updateLocation = async (req, res) => {

  try {

    const { partnerId, lat, lng } = req.body;

    const user = await User.findByIdAndUpdate(
      partnerId,
      {
        location: {
          type: "Point",
          coordinates: [lng, lat]
        }
      },
      { returnDocument: "after" }
    );

    /* REALTIME LOCATION UPDATE */

    req.app.get("io").emit("deliveryLocationUpdate", {
      partnerId,
      lat,
      lng
    });

    res.json(user);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};



/* DISTANCE FUNCTION */

function getDistance(lat1, lng1, lat2, lng2) {

  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;

}



/* AUTO ASSIGN NEAREST DELIVERY PARTNER */

exports.autoAssignDelivery = async (req, res) => {

  try {

    const { storeLat, storeLng, orderId } = req.body;

    const partners = await User.find({
      role: "delivery",
      isAvailable: true
    });

    let nearest = null;
    let minDistance = Infinity;

    for (const p of partners) {

      if (!p.location || !p.location.coordinates) continue;

      const [lng, lat] = p.location.coordinates;

      const distance = getDistance(
        storeLat,
        storeLng,
        lat,
        lng
      );

      if (distance < minDistance) {

        minDistance = distance;
        nearest = p;

      }

    }

    if (!nearest) {
      return res.json({
        message: "No delivery partner available"
      });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        deliveryPartnerId: nearest._id,
        status: "out_for_delivery"
      },
      { returnDocument: "after" }
    );

    nearest.isAvailable = false;
    await nearest.save();

    res.json({
      message: "Delivery partner auto assigned",
      order
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
  const eta = calculateETA(storeLocation, { lat, lng })

req.app.get("io").emit("deliveryLocationUpdate", {
partnerId,
lat,
lng,
eta
})

};