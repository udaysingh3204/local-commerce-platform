const {
  getDemoStatus,
  seedFullDemoData,
  seedOperationsScenario,
  seedGrowthScenario,
  seedWholesaleOnlyScenario,
} = require("../services/demoDataService");

exports.getStatus = async (req, res) => {
  try {
    const status = await getDemoStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.seedFull = async (req, res) => {
  try {
    const status = await seedFullDemoData();
    res.json({ message: "Full demo scenario refreshed.", status });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.seedOperations = async (req, res) => {
  try {
    const status = await seedOperationsScenario();
    res.json({ message: "Retail and delivery demo scenario refreshed.", status });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.seedGrowth = async (req, res) => {
  try {
    const status = await seedGrowthScenario();
    res.json({ message: "Growth lead scenario refreshed.", status });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.seedWholesale = async (req, res) => {
  try {
    const status = await seedWholesaleOnlyScenario();
    res.json({ message: "Supplier and wholesale scenario refreshed.", status });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};