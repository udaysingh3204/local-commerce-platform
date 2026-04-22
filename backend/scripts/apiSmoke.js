require("dotenv").config();
const axios = require("axios");

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:5000";
const CUSTOMER_EMAIL = process.env.SMOKE_CUSTOMER_EMAIL || "customer.one@localmart.demo";
const CUSTOMER_PASSWORD = process.env.SMOKE_CUSTOMER_PASSWORD || "Customer12345!";
const DRIVER_EMAIL = process.env.SMOKE_DRIVER_EMAIL || "driver.one@localmart.demo";
const DRIVER_PASSWORD = process.env.SMOKE_DRIVER_PASSWORD || "Driver12345!";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "admin@localmart.demo";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "Admin12345!";

const logPass = (name, detail = "") => console.log(`[OK] ${name}${detail ? ` :: ${detail}` : ""}`);
const logFail = (name, detail = "") => console.log(`[FAIL] ${name}${detail ? ` :: ${detail}` : ""}`);

const run = async () => {
  try {
    const appConfig = await axios.get(`${BASE_URL}/api/app/config`);
    logPass("app config", `apiVersion=${appConfig.data.apiVersion}`);

    const stores = await axios.get(`${BASE_URL}/api/stores`);
    logPass("stores", `count=${Array.isArray(stores.data) ? stores.data.length : 0}`);

    const paymentConfig = await axios.get(`${BASE_URL}/api/payment/config`);
    logPass("payment config", `provider=${paymentConfig.data.provider} mock=${paymentConfig.data.isMock}`);

    const customerLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: CUSTOMER_EMAIL,
      password: CUSTOMER_PASSWORD,
    });

    const customerToken = customerLogin.data.token;

    const customerBootstrap = await axios.get(`${BASE_URL}/api/auth/bootstrap`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    logPass("customer bootstrap", `roleHome=${customerBootstrap.data.session?.roleHome}`);

    const customerOrders = await axios.get(`${BASE_URL}/api/orders/customer/${customerLogin.data.user._id}`);
    logPass("customer orders", `count=${Array.isArray(customerOrders.data) ? customerOrders.data.length : 0}`);

    const wishlist = await axios.get(`${BASE_URL}/api/wishlist`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    logPass("wishlist", `count=${Array.isArray(wishlist.data) ? wishlist.data.length : 0}`);

    const referral = await axios.get(`${BASE_URL}/api/referral/my-details`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    logPass("referral", `code=${referral.data.code || "n/a"}`);

    const driverLogin = await axios.post(`${BASE_URL}/api/driver/login`, {
      email: DRIVER_EMAIL,
      password: DRIVER_PASSWORD,
    });

    const driverToken = driverLogin.data.token;

    const driverBootstrap = await axios.get(`${BASE_URL}/api/driver/bootstrap`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    logPass("driver bootstrap", `active=${driverBootstrap.data.startup?.activeDeliveries}`);

    const driverInsights = await axios.get(`${BASE_URL}/api/driver/me/insights`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    logPass("driver insights", `weeklyEarnings=${driverInsights.data.earnings?.thisWeek || 0}`);

    const adminLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const adminToken = adminLogin.data.token;

    const adminAnalytics = await axios.get(`${BASE_URL}/api/admin/analytics/dashboard?daysBack=7`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logPass("admin analytics", `orders=${adminAnalytics.data.kpis?.totalOrders || 0}`);

    const dispatchStats = await axios.get(`${BASE_URL}/api/dispatch/ml/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logPass("dispatch stats", `completionRate=${dispatchStats.data.orderStats?.completionRate || 0}`);

    logPass("api smoke", "complete");
  } catch (error) {
    if (error.response) {
      logFail("api smoke", `${error.config?.url} -> ${error.response.status}`);
    } else {
      logFail("api smoke", error.message);
    }
    process.exit(1);
  }
};

run();
