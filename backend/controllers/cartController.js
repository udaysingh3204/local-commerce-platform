const Cart = require("../models/Cart");

exports.addToCart = async (req, res) => {

  try {

    const { customerId, productId, quantity } = req.body;

    let cart = await Cart.findOne({ customerId });

    if (!cart) {
      cart = new Cart({
        customerId,
        items: []
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex > -1) {

      cart.items[itemIndex].quantity += quantity;

    } else {

      cart.items.push({ productId, quantity });

    }

    await cart.save();

    res.json({
      message: "Item added to cart",
      cart
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};


exports.getCart = async (req, res) => {

  try {

    const cart = await Cart.findOne({
      customerId: req.params.customerId
    }).populate("items.productId");

    res.json(cart);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};