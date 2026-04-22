require("dotenv").config();

const mongoose = require("mongoose");
const { seedFullDemoData, demoCredentials } = require("../services/demoDataService");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const status = await seedFullDemoData();

  console.log("Demo data seeded successfully.");
  console.log("Accounts:");
  demoCredentials.forEach((entry) => {
    console.log(`  ${entry.role}: ${entry.email} / ${entry.password}`);
  });
  console.log("Counts:", status.counts);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message || error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});