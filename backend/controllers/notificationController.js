const Notification = require("../models/Notification");

exports.getNotifications = async (req, res) => {

  try {

    const notifications = await Notification.find({
      userId: req.params.userId
    }).sort({ createdAt: -1 });

    res.json(notifications);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};