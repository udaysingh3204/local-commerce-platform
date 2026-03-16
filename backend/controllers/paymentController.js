const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY || "test",
  key_secret: process.env.RAZORPAY_SECRET || "test"
});


/* CREATE PAYMENT ORDER */

exports.createPaymentOrder = async (req, res) => {

  try {

    const { amount } = req.body;

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "order_" + Date.now()
    };

    const order = await razorpay.orders.create(options);

    res.json(order);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};


/* VERIFY PAYMENT */

exports.verifyPayment = async (req, res) => {

  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature === razorpay_signature) {

      return res.json({
        success: true,
        message: "Payment verified successfully"
      });

    }

    res.status(400).json({
      success: false,
      message: "Invalid payment signature"
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};