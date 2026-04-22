const express = require("express")
const router = express.Router()
const { protect } = require("../middleware/authMiddleware")
const { getAddresses, createAddress, updateAddress, deleteAddress, setDefault } = require("../controllers/addressController")

router.use(protect)

router.get("/", getAddresses)
router.post("/", createAddress)
router.patch("/:id", updateAddress)
router.delete("/:id", deleteAddress)
router.patch("/:id/default", setDefault)

module.exports = router
