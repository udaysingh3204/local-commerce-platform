const cloudinary = require("../config/cloudinary")

exports.uploadImage = async (req, res) => {

  try {

    const file = req.file

    const result = await cloudinary.uploader.upload(file.path, {
      folder: "local-commerce-products"
    })

    res.json({
      imageUrl: result.secure_url
    })

  } catch (error) {

    res.status(500).json({
      error: error.message
    })

  }

}