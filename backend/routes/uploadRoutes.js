const express = require("express")
const router = express.Router()

const upload = require("../middleware/upload")
const cloudinary = require("../config/cloudinary")

router.post("/", upload.single("image"), async (req, res) => {
  try {

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "local-commerce-products"
    })

    res.json({
      imageUrl: result.secure_url
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router