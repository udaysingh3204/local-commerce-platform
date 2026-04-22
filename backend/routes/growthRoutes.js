const express = require("express");

const { captureLead, listLeads, updateLead } = require("../controllers/growthController");

const router = express.Router();

router.get("/leads", listLeads);
router.post("/leads", captureLead);
router.patch("/leads/:id", updateLead);

module.exports = router;