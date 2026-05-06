const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Driver = require("../models/Driver");
const Store = require("../models/Store");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const GrowthLead = require("../models/GrowthLead");
const WholesaleProduct = require("../models/WholesaleProduct");
const WholesaleOrder = require("../models/WholesaleOrder");

const demoCredentials = [
  { role: "admin", email: "admin@localmart.demo", password: "Admin12345!" },
  { role: "vendor", email: "vendor.grocery@localmart.demo", password: "Vendor12345!" },
  { role: "vendor", email: "vendor.bakery@localmart.demo", password: "Vendor12345!" },
  { role: "vendor", email: "vendor.cafe@localmart.demo", password: "Vendor12345!" },
  { role: "vendor", email: "vendor.pharmacy@localmart.demo", password: "Vendor12345!" },
  { role: "vendor", email: "vendor.essentials@localmart.demo", password: "Vendor12345!" },
  { role: "supplier", email: "supplier@localmart.demo", password: "Supplier12345!" },
  { role: "customer", email: "customer.one@localmart.demo", password: "Customer12345!" },
  { role: "customer", email: "customer.two@localmart.demo", password: "Customer12345!" },
  { role: "customer", email: "customer.three@localmart.demo", password: "Customer12345!" },
  { role: "driver", email: "driver.one@localmart.demo", password: "Driver12345!" },
  { role: "driver", email: "driver.two@localmart.demo", password: "Driver12345!" },
  { role: "driver", email: "driver.three@localmart.demo", password: "Driver12345!" },
  { role: "driver", email: "driver.four@localmart.demo", password: "Driver12345!" },
];

const demoUsers = [
  { name: "Aarav Admin", email: "admin@localmart.demo", password: "Admin12345!", role: "admin", phone: "+91-9990000001" },
  { name: "Vanya Grocer", email: "vendor.grocery@localmart.demo", password: "Vendor12345!", role: "vendor", phone: "+91-9990000002" },
  { name: "Kabir Baker", email: "vendor.bakery@localmart.demo", password: "Vendor12345!", role: "vendor", phone: "+91-9990000003" },
  { name: "Tara Cafe", email: "vendor.cafe@localmart.demo", password: "Vendor12345!", role: "vendor", phone: "+91-9990000004" },
  { name: "Mehul Pharma", email: "vendor.pharmacy@localmart.demo", password: "Vendor12345!", role: "vendor", phone: "+91-9990000005" },
  { name: "Nisha Essentials", email: "vendor.essentials@localmart.demo", password: "Vendor12345!", role: "vendor", phone: "+91-9990000006" },
  { name: "Sara Supplier", email: "supplier@localmart.demo", password: "Supplier12345!", role: "supplier", phone: "+91-9990000007" },
  { name: "Riya Customer", email: "customer.one@localmart.demo", password: "Customer12345!", role: "customer", phone: "+91-9990000008" },
  { name: "Arjun Customer", email: "customer.two@localmart.demo", password: "Customer12345!", role: "customer", phone: "+91-9990000009" },
  { name: "Ira Customer", email: "customer.three@localmart.demo", password: "Customer12345!", role: "customer", phone: "+91-9990000010" },
];

const demoDrivers = [
  { name: "Rohit Rider", email: "driver.one@localmart.demo", password: "Driver12345!", coordinates: [77.3910, 28.5355], isAvailable: false },
  { name: "Neha Rider", email: "driver.two@localmart.demo", password: "Driver12345!", coordinates: [77.4015, 28.5482], isAvailable: true },
  { name: "Aditya Rider", email: "driver.three@localmart.demo", password: "Driver12345!", coordinates: [77.3649, 28.6270], isAvailable: true },
  { name: "Meera Rider", email: "driver.four@localmart.demo", password: "Driver12345!", coordinates: [77.4080, 28.5035], isAvailable: false },
];

const demoLeadEmails = [
  "campus.queue@localmart.demo",
  "apartment.crew@localmart.demo",
  "creator.loop@localmart.demo",
  "grocery.fans@localmart.demo",
  "startup.pantry@localmart.demo",
  "late.night.orders@localmart.demo",
];

const noida = {
  sector18: [77.3178, 28.5708],
  sector27: [77.3319, 28.5853],
  sector50: [77.3632, 28.5721],
  sector62: [77.3649, 28.6270],
  sector76: [77.4029, 28.5603],
  sector104: [77.3824, 28.5448],
  sector137: [77.4080, 28.5035],
  sector143: [77.4202, 28.5196],
};

const createCatalogImage = (title, accent, label) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="800" height="800" fill="url(#bg)" />
      <rect x="54" y="54" width="692" height="692" rx="44" fill="#ffffff" fill-opacity="0.78" />
      <rect x="96" y="112" width="608" height="88" rx="24" fill="${accent}" fill-opacity="0.14" />
      <text x="400" y="170" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#111827">${label}</text>
      <text x="400" y="380" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="700" fill="#111827">${title}</text>
      <text x="400" y="448" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#4b5563">LocalMart curated demo catalog</text>
      <circle cx="156" cy="640" r="28" fill="${accent}" fill-opacity="0.22" />
      <circle cx="646" cy="622" r="42" fill="${accent}" fill-opacity="0.18" />
      <circle cx="604" cy="214" r="16" fill="${accent}" fill-opacity="0.32" />
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\n\s+/g, " ").trim())}`;
};

const catalogItem = (name, price, stock, category, accent, label) => ({
  name,
  price,
  stock,
  category,
  image: createCatalogImage(name, accent, label),
});

const storeDefinitions = [
  {
    storeName: "Fresh Basket Noida",
    vendorEmail: "vendor.grocery@localmart.demo",
    category: "grocery",
    address: "Shop 12, Atta Market, Sector 18, Noida",
    deliveryRadius: 8,
    coordinates: noida.sector18,
    products: [
      catalogItem("Amul Taaza Milk 1L", 64, 48, "dairy & breakfast", "#10b981", "Everyday dairy"),
      catalogItem("Mother Dairy Curd 400g", 42, 38, "dairy & breakfast", "#059669", "Fresh dairy"),
      catalogItem("Farm Eggs 12 pcs", 96, 30, "dairy & breakfast", "#f59e0b", "Protein picks"),
      catalogItem("Banana Robusta 6 pcs", 58, 80, "fresh fruits", "#84cc16", "Fresh fruits"),
      catalogItem("Shimla Apple 1kg", 189, 36, "fresh fruits", "#ef4444", "Fresh fruits"),
      catalogItem("Onion 1kg", 39, 120, "fresh vegetables", "#a855f7", "Kitchen basics"),
      catalogItem("Tomato Hybrid 1kg", 34, 110, "fresh vegetables", "#f97316", "Kitchen basics"),
      catalogItem("Aashirvaad Atta 5kg", 289, 26, "atta rice & dal", "#f59e0b", "Staples"),
      catalogItem("India Gate Basmati Rice 5kg", 449, 24, "atta rice & dal", "#0ea5e9", "Staples"),
      catalogItem("Fortune Sunlite Oil 1L", 168, 32, "atta rice & dal", "#eab308", "Staples"),
      catalogItem("Tata Salt 1kg", 28, 65, "masala & condiments", "#64748b", "Pantry"),
      catalogItem("Maggi Noodles Pack of 4", 56, 84, "instant & ready-to-eat", "#f97316", "Quick meals"),
      catalogItem("Lay's American Style 52g", 20, 55, "snacks & munchies", "#fb7185", "Snacks"),
      catalogItem("Coca-Cola 750ml", 40, 40, "cold drinks & juices", "#dc2626", "Beverages"),
      catalogItem("Tata Tea Gold 500g", 299, 22, "tea & coffee", "#7c3aed", "Tea corner"),
    ],
  },
  {
    storeName: "Daily Pantry Express",
    vendorEmail: "vendor.grocery@localmart.demo",
    category: "grocery",
    address: "Tower Plaza, Sector 62, Noida",
    deliveryRadius: 7,
    coordinates: noida.sector62,
    products: [
      catalogItem("Toned Milk 500ml", 34, 72, "dairy & breakfast", "#06b6d4", "Morning essentials"),
      catalogItem("Brown Bread 400g", 48, 42, "bakery & biscuits", "#ca8a04", "Breakfast picks"),
      catalogItem("Peanut Butter Crunchy 350g", 169, 22, "breakfast & spreads", "#92400e", "Breakfast picks"),
      catalogItem("Muesli Fruit & Nut 500g", 298, 18, "breakfast & spreads", "#7c3aed", "Healthy pantry"),
      catalogItem("Moong Dal 1kg", 138, 30, "atta rice & dal", "#16a34a", "Staples"),
      catalogItem("Toor Dal 1kg", 176, 28, "atta rice & dal", "#0891b2", "Staples"),
      catalogItem("Sugar 1kg", 48, 34, "masala & condiments", "#64748b", "Kitchen basics"),
      catalogItem("Detergent Powder 1kg", 119, 25, "cleaning essentials", "#2563eb", "Home care"),
      catalogItem("Dishwash Gel 750ml", 99, 16, "cleaning essentials", "#0f766e", "Home care"),
      catalogItem("Tissue Roll Pack of 6", 189, 14, "home needs", "#9333ea", "Home care"),
      catalogItem("Mineral Water 2L", 30, 54, "cold drinks & juices", "#0ea5e9", "Hydration"),
      catalogItem("Orange Juice 1L", 118, 21, "cold drinks & juices", "#f97316", "Hydration"),
      catalogItem("Surf Excel Easy Wash 500g", 78, 24, "cleaning essentials", "#1d4ed8", "Laundry care"),
      catalogItem("Good Day Butter Cookies", 35, 37, "snacks & munchies", "#d97706", "Tea time"),
      catalogItem("Kellogg's Corn Flakes 475g", 185, 17, "breakfast & spreads", "#eab308", "Morning bowl"),
    ],
  },
  {
    storeName: "Midnight Oven",
    vendorEmail: "vendor.bakery@localmart.demo",
    category: "bakery",
    address: "Central Arcade, Sector 76, Noida",
    deliveryRadius: 6,
    coordinates: noida.sector76,
    products: [
      catalogItem("Sourdough Loaf", 185, 18, "artisanal breads", "#f59e0b", "Freshly baked"),
      catalogItem("Multigrain Bread", 95, 22, "artisanal breads", "#a16207", "Freshly baked"),
      catalogItem("Butter Croissant Box", 245, 14, "pastries & desserts", "#fb923c", "Pastries"),
      catalogItem("Chocolate Brownie Pack", 165, 20, "pastries & desserts", "#7c2d12", "Pastries"),
      catalogItem("Red Velvet Slice", 170, 12, "cakes & slices", "#e11d48", "Cake studio"),
      catalogItem("Tiramisu Jar", 195, 10, "cakes & slices", "#7c3aed", "Cake studio"),
      catalogItem("Garlic Breadsticks", 110, 24, "savory bakery", "#ca8a04", "Snack bakes"),
      catalogItem("Veg Puff", 35, 32, "savory bakery", "#ea580c", "Snack bakes"),
      catalogItem("Cold Coffee Bottle", 135, 18, "beverages", "#0ea5e9", "Cafe drinks"),
      catalogItem("Classic Cheesecake Slice", 210, 8, "cakes & slices", "#ec4899", "Cake studio"),
      catalogItem("Blueberry Danish", 145, 13, "pastries & desserts", "#2563eb", "Pastries"),
      catalogItem("Cinnamon Roll", 120, 16, "pastries & desserts", "#b45309", "Pastries"),
      catalogItem("Mushroom Quiche", 185, 11, "savory bakery", "#16a34a", "Snack bakes"),
      catalogItem("Baguette", 90, 14, "artisanal breads", "#92400e", "Bread shelf"),
      catalogItem("Hazelnut Eclair", 160, 9, "pastries & desserts", "#be123c", "Dessert counter"),
    ],
  },
  {
    storeName: "Brew & Bite Cafe",
    vendorEmail: "vendor.cafe@localmart.demo",
    category: "food",
    address: "Skyline Hub, Sector 50, Noida",
    deliveryRadius: 7,
    coordinates: noida.sector50,
    products: [
      catalogItem("Iced Americano", 120, 28, "beverages", "#0f766e", "Cafe specials"),
      catalogItem("Hazelnut Cold Coffee", 165, 20, "beverages", "#155e75", "Cafe specials"),
      catalogItem("Masala Sandwich", 145, 18, "ready-to-eat", "#f97316", "Snack meals"),
      catalogItem("Paneer Wrap", 189, 15, "ready-to-eat", "#f59e0b", "Snack meals"),
      catalogItem("Greek Yogurt Parfait", 155, 12, "healthy bites", "#10b981", "Healthy picks"),
      catalogItem("Banana Walnut Muffin", 95, 16, "bakery & biscuits", "#a16207", "Fresh bakes"),
      catalogItem("Blueberry Yogurt Smoothie", 175, 10, "healthy bites", "#2563eb", "Healthy picks"),
      catalogItem("Peri Peri Fries", 110, 18, "snacks & munchies", "#dc2626", "Snack meals"),
      catalogItem("Chicken Club Sandwich", 235, 12, "ready-to-eat", "#7c2d12", "Cafe kitchen"),
      catalogItem("Veg Caesar Salad", 210, 9, "healthy bites", "#16a34a", "Healthy picks"),
      catalogItem("Pesto Pasta Bowl", 245, 11, "ready-to-eat", "#84cc16", "Lunch bowl"),
      catalogItem("Tandoori Paneer Bagel", 175, 13, "ready-to-eat", "#f43f5e", "Cafe kitchen"),
      catalogItem("Mocha Frappe", 190, 10, "beverages", "#6366f1", "Cafe specials"),
      catalogItem("Chocolate Granola Bowl", 165, 8, "healthy bites", "#7c2d12", "Healthy picks"),
      catalogItem("Loaded Nachos", 199, 9, "snacks & munchies", "#ea580c", "Snack meals"),
    ],
  },
  {
    storeName: "CarePlus Pharmacy",
    vendorEmail: "vendor.pharmacy@localmart.demo",
    category: "pharmacy",
    address: "Market Complex, Sector 104, Noida",
    deliveryRadius: 8,
    coordinates: noida.sector104,
    products: [
      catalogItem("Paracetamol 650mg", 32, 75, "medicines", "#2563eb", "Daily care"),
      catalogItem("Vitamin C Tablets", 149, 26, "wellness", "#0ea5e9", "Immunity"),
      catalogItem("Digital Thermometer", 220, 11, "devices", "#334155", "Health devices"),
      catalogItem("Cough Syrup 100ml", 118, 20, "medicines", "#7c3aed", "Cold relief"),
      catalogItem("Antiseptic Liquid 500ml", 145, 14, "first aid", "#0891b2", "First aid"),
      catalogItem("Face Mask Pack of 10", 85, 30, "wellness", "#64748b", "Protection"),
      catalogItem("Baby Diaper Pants M 28", 399, 17, "baby care", "#f472b6", "Baby care"),
      catalogItem("Protein Supplement 500g", 699, 9, "wellness", "#f97316", "Fitness"),
      catalogItem("Pain Relief Spray", 210, 13, "first aid", "#dc2626", "Quick relief"),
      catalogItem("Hand Sanitizer 500ml", 99, 25, "wellness", "#10b981", "Protection"),
      catalogItem("ORS Sachet Pack", 48, 22, "wellness", "#06b6d4", "Daily care"),
      catalogItem("Bandage Roll", 38, 27, "first aid", "#475569", "First aid"),
      catalogItem("Calcium Tablets", 220, 12, "wellness", "#9333ea", "Bone care"),
      catalogItem("Steam Inhaler", 890, 6, "devices", "#1d4ed8", "Health devices"),
      catalogItem("Baby Wipes 72 pcs", 145, 15, "baby care", "#ec4899", "Baby care"),
    ],
  },
  {
    storeName: "HomeNest Essentials",
    vendorEmail: "vendor.essentials@localmart.demo",
    category: "home",
    address: "Residency Plaza, Sector 137, Noida",
    deliveryRadius: 9,
    coordinates: noida.sector137,
    products: [
      catalogItem("Floor Cleaner 1L", 149, 28, "cleaning essentials", "#0ea5e9", "Home essentials"),
      catalogItem("Glass Cleaner 500ml", 109, 16, "cleaning essentials", "#06b6d4", "Home essentials"),
      catalogItem("Laundry Liquid 2L", 329, 14, "cleaning essentials", "#1d4ed8", "Laundry care"),
      catalogItem("Garbage Bags Large 30 pcs", 99, 22, "home needs", "#475569", "Daily utility"),
      catalogItem("Aluminium Foil 9m", 95, 18, "kitchen essentials", "#64748b", "Kitchen utility"),
      catalogItem("Storage Container Set", 399, 10, "kitchen essentials", "#7c3aed", "Kitchen utility"),
      catalogItem("LED Bulb 12W", 120, 25, "home needs", "#eab308", "Quick fixes"),
      catalogItem("Mosquito Repellent Refill", 82, 30, "home needs", "#16a34a", "Daily utility"),
      catalogItem("Toilet Cleaner 1L", 136, 18, "cleaning essentials", "#dc2626", "Bathroom care"),
      catalogItem("Scrub Sponge Pack of 4", 60, 35, "kitchen essentials", "#f97316", "Kitchen utility"),
      catalogItem("Ziplock Storage Bags", 129, 14, "kitchen essentials", "#22c55e", "Kitchen utility"),
      catalogItem("Air Freshener Spray", 149, 11, "home needs", "#38bdf8", "Home freshness"),
      catalogItem("Microfiber Cloth Set", 175, 12, "cleaning essentials", "#8b5cf6", "Home essentials"),
      catalogItem("Bamboo Dustbin", 499, 7, "home needs", "#92400e", "Daily utility"),
      catalogItem("Steel Dish Rack", 899, 5, "kitchen essentials", "#64748b", "Kitchen utility"),
    ],
  },
  {
    storeName: "Fresh Harvest Greens",
    vendorEmail: "vendor.grocery@localmart.demo",
    category: "fruits",
    address: "Neighbourhood Market, Sector 143, Noida",
    deliveryRadius: 6,
    coordinates: noida.sector143,
    products: [
      catalogItem("Baby Spinach 250g", 68, 22, "fresh vegetables", "#16a34a", "Greens & herbs"),
      catalogItem("Broccoli 500g", 92, 18, "fresh vegetables", "#059669", "Greens & herbs"),
      catalogItem("Coriander Bunch", 18, 44, "fresh vegetables", "#22c55e", "Greens & herbs"),
      catalogItem("Ginger 250g", 36, 34, "fresh vegetables", "#ea580c", "Kitchen basics"),
      catalogItem("Garlic 500g", 62, 26, "fresh vegetables", "#a855f7", "Kitchen basics"),
      catalogItem("Kiwi 3 pcs", 110, 15, "fresh fruits", "#65a30d", "Seasonal fruits"),
      catalogItem("Pomegranate 1kg", 180, 17, "fresh fruits", "#be123c", "Seasonal fruits"),
      catalogItem("Tender Coconut", 65, 12, "cold drinks & juices", "#0f766e", "Hydration"),
      catalogItem("Fresh Orange Juice 300ml", 70, 14, "cold drinks & juices", "#f97316", "Fresh pressed"),
      catalogItem("Salad Combo Box", 125, 11, "healthy bites", "#0ea5e9", "Healthy picks"),
      catalogItem("Strawberry Punnet", 145, 9, "fresh fruits", "#ef4444", "Seasonal fruits"),
      catalogItem("Avocado 2 pcs", 199, 8, "fresh fruits", "#84cc16", "Premium fruits"),
      catalogItem("Lettuce Iceberg", 52, 16, "fresh vegetables", "#22c55e", "Greens & herbs"),
      catalogItem("Mushroom Button 200g", 78, 15, "fresh vegetables", "#a16207", "Kitchen basics"),
      catalogItem("Mint Leaves Bunch", 15, 29, "fresh vegetables", "#16a34a", "Greens & herbs"),
    ],
  },
  {
    storeName: "Dairy Dawn Depot",
    vendorEmail: "vendor.grocery@localmart.demo",
    category: "dairy",
    address: "Cold Chain Point, Sector 27, Noida",
    deliveryRadius: 6,
    coordinates: noida.sector27,
    products: [
      catalogItem("Full Cream Milk 1L", 72, 36, "milk", "#38bdf8", "Milk bar"),
      catalogItem("Double Toned Milk 1L", 66, 42, "milk", "#0ea5e9", "Milk bar"),
      catalogItem("Greek Yogurt 400g", 125, 16, "curd & yogurt", "#8b5cf6", "Protein dairy"),
      catalogItem("Classic Curd 1kg", 78, 24, "curd & yogurt", "#6366f1", "Fresh dairy"),
      catalogItem("Salted Butter 500g", 285, 13, "butter & cheese", "#f59e0b", "Dairy blocks"),
      catalogItem("Cheddar Cheese Slices", 145, 18, "butter & cheese", "#f97316", "Dairy blocks"),
      catalogItem("Mozzarella 200g", 165, 15, "butter & cheese", "#fb923c", "Pizza dairy"),
      catalogItem("Paneer 500g", 210, 17, "paneer", "#eab308", "Paneer shelf"),
      catalogItem("Fresh Cream 250ml", 78, 16, "cream", "#ec4899", "Dessert dairy"),
      catalogItem("Buttermilk 750ml", 38, 32, "beverages", "#14b8a6", "Cooling drinks"),
      catalogItem("Flavoured Yogurt Mango", 42, 20, "curd & yogurt", "#f59e0b", "Snack dairy"),
      catalogItem("Chocolate Milk 180ml", 30, 28, "beverages", "#7c2d12", "Kids dairy"),
      catalogItem("Lassi Sweet 200ml", 24, 26, "beverages", "#06b6d4", "Cooling drinks"),
      catalogItem("Malai Paneer 200g", 98, 19, "paneer", "#22c55e", "Paneer shelf"),
      catalogItem("Unsalted Butter 100g", 65, 21, "butter & cheese", "#facc15", "Dairy blocks"),
    ],
  },
  {
    storeName: "Fizz & Flow Beverages",
    vendorEmail: "vendor.cafe@localmart.demo",
    category: "beverages",
    address: "Refresh Corner, Sector 104, Noida",
    deliveryRadius: 7,
    coordinates: noida.sector104,
    products: [
      catalogItem("Sparkling Water Lime", 55, 30, "sparkling", "#0ea5e9", "Cool drinks"),
      catalogItem("Cold Brew Bottle", 165, 18, "coffee", "#0f766e", "Coffee bar"),
      catalogItem("Matcha Latte Can", 140, 12, "tea", "#22c55e", "Tea bar"),
      catalogItem("Classic Lemonade 500ml", 60, 22, "juices", "#eab308", "Summer drinks"),
      catalogItem("Cranberry Juice 1L", 145, 14, "juices", "#be123c", "Juice bar"),
      catalogItem("Energy Drink 250ml", 125, 20, "functional drinks", "#ef4444", "Quick boost"),
      catalogItem("Kombucha Ginger Lemon", 185, 10, "functional drinks", "#f97316", "Healthy sips"),
      catalogItem("Protein Shake Vanilla", 210, 9, "functional drinks", "#8b5cf6", "Fitness fuel"),
      catalogItem("Green Tea Bottle", 95, 17, "tea", "#16a34a", "Tea bar"),
      catalogItem("Mocha Milkshake", 175, 11, "coffee", "#7c2d12", "Dessert drinks"),
      catalogItem("Watermelon Cooler", 85, 16, "juices", "#fb7185", "Summer drinks"),
      catalogItem("Iced Peach Tea", 110, 13, "tea", "#f59e0b", "Tea bar"),
      catalogItem("Americano Can", 95, 21, "coffee", "#334155", "Coffee bar"),
      catalogItem("Coconut Water 500ml", 65, 24, "juices", "#14b8a6", "Hydration"),
      catalogItem("Zero Sugar Cola 330ml", 48, 25, "sparkling", "#dc2626", "Cool drinks"),
    ],
  },
  {
    storeName: "Glow Personal Care",
    vendorEmail: "vendor.pharmacy@localmart.demo",
    category: "personal-care",
    address: "Lifestyle Arcade, Sector 50, Noida",
    deliveryRadius: 6,
    coordinates: noida.sector50,
    products: [
      catalogItem("Hydrating Face Wash", 249, 18, "skin care", "#06b6d4", "Glow shelf"),
      catalogItem("Vitamin C Serum", 699, 9, "skin care", "#f59e0b", "Glow shelf"),
      catalogItem("Daily Sunscreen SPF 50", 499, 14, "skin care", "#eab308", "Sun care"),
      catalogItem("Nourishing Shampoo", 299, 17, "hair care", "#7c3aed", "Hair care"),
      catalogItem("Repair Conditioner", 325, 15, "hair care", "#8b5cf6", "Hair care"),
      catalogItem("Body Wash Lavender", 220, 19, "bath & body", "#c084fc", "Bath shelf"),
      catalogItem("Moisturizing Lotion", 345, 12, "bath & body", "#ec4899", "Body care"),
      catalogItem("Deodorant Spray", 199, 20, "grooming", "#334155", "Daily grooming"),
      catalogItem("Toothpaste Herbal", 95, 28, "oral care", "#10b981", "Oral care"),
      catalogItem("Mouthwash 250ml", 145, 16, "oral care", "#0ea5e9", "Oral care"),
      catalogItem("Cotton Pads Pack", 85, 24, "beauty tools", "#f472b6", "Beauty tools"),
      catalogItem("Lip Balm Berry", 129, 21, "skin care", "#ef4444", "Pocket care"),
      catalogItem("Hair Serum Smooth", 399, 11, "hair care", "#14b8a6", "Hair care"),
      catalogItem("Beard Trimmer Oil", 189, 13, "grooming", "#7c2d12", "Daily grooming"),
      catalogItem("Face Sheet Mask", 120, 22, "skin care", "#f97316", "Glow shelf"),
    ],
  },
  {
    storeName: "Snack Street Hub",
    vendorEmail: "vendor.essentials@localmart.demo",
    category: "snacks",
    address: "Quick Bite Corner, Sector 76, Noida",
    deliveryRadius: 7,
    coordinates: noida.sector76,
    products: [
      catalogItem("Masala Makhana 60g", 85, 26, "healthy snacks", "#f59e0b", "Crunch picks"),
      catalogItem("Trail Mix Jar", 199, 14, "healthy snacks", "#84cc16", "Crunch picks"),
      catalogItem("Nacho Chips", 75, 23, "party snacks", "#f97316", "Party shelf"),
      catalogItem("Salsa Dip", 99, 17, "party snacks", "#ef4444", "Party shelf"),
      catalogItem("Chocolate Wafers", 45, 35, "sweet snacks", "#7c2d12", "Sweet shelf"),
      catalogItem("Salted Peanuts 200g", 55, 28, "savory snacks", "#ca8a04", "Crunch picks"),
      catalogItem("Protein Chips", 110, 16, "healthy snacks", "#8b5cf6", "Fitness crunch"),
      catalogItem("Mini Pretzel Pack", 65, 24, "savory snacks", "#92400e", "Snack bar"),
      catalogItem("Brownie Bites", 120, 13, "sweet snacks", "#be123c", "Sweet shelf"),
      catalogItem("Granola Bar Pack", 150, 15, "healthy snacks", "#16a34a", "Snack bar"),
      catalogItem("Cheese Crackers", 60, 21, "savory snacks", "#eab308", "Crunch picks"),
      catalogItem("Wasabi Peas", 75, 19, "savory snacks", "#22c55e", "Snack bar"),
      catalogItem("Choco Almond Clusters", 165, 12, "sweet snacks", "#9333ea", "Sweet shelf"),
      catalogItem("Corn Rings Peri Peri", 48, 27, "party snacks", "#dc2626", "Party shelf"),
      catalogItem("Dates & Nuts Box", 185, 11, "healthy snacks", "#b45309", "Premium bites"),
    ],
  },
];

const wholesaleCatalog = [
  { name: "Premium Flour 25kg", pricePerUnit: 1180, minOrderQty: 5, stock: 220, category: "bakery" },
  { name: "Cold Brew Beans 10kg", pricePerUnit: 4200, minOrderQty: 2, stock: 40, category: "beverages" },
  { name: "Fresh Dairy Pack", pricePerUnit: 860, minOrderQty: 6, stock: 90, category: "dairy" },
  { name: "Fresh Produce Crate", pricePerUnit: 1540, minOrderQty: 4, stock: 60, category: "fruits & vegetables" },
  { name: "Cleaning Combo Carton", pricePerUnit: 1320, minOrderQty: 3, stock: 70, category: "home essentials" },
  { name: "Snack Jar Assortment", pricePerUnit: 980, minOrderQty: 5, stock: 95, category: "snacks" },
];

const looksLikeSafeDemoDatabase = (mongoUri = "") => /localhost|127\.0\.0\.1|\/local-commerce-demo|\/test/i.test(mongoUri);

const ensureSafeDemoTarget = () => {
  if (!looksLikeSafeDemoDatabase(process.env.MONGO_URI || "")) {
    throw new Error("Refusing demo data mutation because MONGO_URI does not look like a local, demo, or test database.");
  }
};

const buildItems = (products, lines) => lines.map(({ name, quantity }) => {
  const product = products.find((entry) => entry.name === name);

  if (!product) {
    throw new Error(`Missing demo product: ${name}`);
  }

  return {
    productId: product._id,
    name: product.name,
    image: product.image,
    quantity,
    price: product.price,
  };
});

const calculateTotal = (items) => items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const ensureDemoIdentities = async () => {
  const hashedPasswords = await Promise.all(demoUsers.map((entry) => bcrypt.hash(entry.password, 10)));
  const hashedDriverPasswords = await Promise.all(demoDrivers.map((entry) => bcrypt.hash(entry.password, 10)));

  const userMap = {};
  for (const [index, entry] of demoUsers.entries()) {
    const user = await User.findOneAndUpdate(
      { email: entry.email },
      {
        name: entry.name,
        email: entry.email,
        phone: entry.phone,
        password: hashedPasswords[index],
        role: entry.role,
        authProvider: "local",
        isActive: true,
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
    userMap[entry.email] = user;
  }

  const driverMap = {};
  for (const [index, entry] of demoDrivers.entries()) {
    const driver = await Driver.findOneAndUpdate(
      { email: entry.email },
      {
        name: entry.name,
        email: entry.email,
        password: hashedDriverPasswords[index],
        authProvider: "local",
        isAvailable: entry.isAvailable,
        location: {
          type: "Point",
          coordinates: entry.coordinates,
        },
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
    driverMap[entry.email] = driver;
  }

  return { userMap, driverMap };
};

const seedRetailCatalog = async (userMap) => {
  const storeMap = {};
  const storeIds = [];

  for (const definition of storeDefinitions) {
    const store = await Store.findOneAndUpdate(
      { storeName: definition.storeName },
      {
        storeName: definition.storeName,
        vendorId: userMap[definition.vendorEmail]._id,
        category: definition.category,
        address: definition.address,
        deliveryRadius: definition.deliveryRadius,
        location: {
          type: "Point",
          coordinates: definition.coordinates,
        },
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );

    storeMap[definition.storeName] = store;
    storeIds.push(store._id);

    await Product.deleteMany({ storeId: store._id });
    await Product.insertMany(definition.products.map((product) => ({
      storeId: store._id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      category: product.category,
      image: product.image,
    })));
  }

  return { storeMap, storeIds };
};

const seedRetailOperations = async ({ userMap, driverMap, storeMap, storeIds }) => {
  const customerEmails = [
    "customer.one@localmart.demo",
    "customer.two@localmart.demo",
    "customer.three@localmart.demo",
  ];
  const customerIds = customerEmails.map((email) => userMap[email]._id);

  await Order.deleteMany({
    $or: [
      { customerId: { $in: customerIds } },
      { storeId: { $in: storeIds } },
    ],
  });

  const catalogByStore = {};
  for (const definition of storeDefinitions) {
    catalogByStore[definition.storeName] = await Product.find({ storeId: storeMap[definition.storeName]._id }).lean();
  }

  const createOrderPayload = ({
    customerEmail,
    storeName,
    lines,
    paymentMethod,
    paymentStatus,
    status,
    customerLocation,
    deliveryAddress,
    createdAt,
    updatedAt,
    paymentFailureReason,
    paymentAttemptCount,
    lastPaymentAttemptAt,
    paymentReference,
    paymentRecoveredAt,
    deliveryPartnerEmail,
    deliveryLocation,
    estimatedDeliveryTime,
    deliveryStartTime,
    deliveryEndTime,
  }) => {
    const items = buildItems(catalogByStore[storeName], lines);

    return {
      customerId: userMap[customerEmail]._id,
      storeId: storeMap[storeName]._id,
      items,
      totalAmount: calculateTotal(items),
      paymentMethod,
      paymentStatus,
      paymentFailureReason,
      paymentAttemptCount,
      lastPaymentAttemptAt,
      paymentReference,
      paymentRecoveredAt,
      status,
      deliveryPartnerId: deliveryPartnerEmail ? driverMap[deliveryPartnerEmail]._id : undefined,
      customerLocation,
      deliveryLocation,
      estimatedDeliveryTime,
      deliveryStartTime,
      deliveryEndTime,
      deliveryAddress,
      storeLocation: {
        type: "Point",
        coordinates: storeDefinitions.find((definition) => definition.storeName === storeName).coordinates,
      },
      createdAt,
      updatedAt,
    };
  };

  const now = Date.now();
  const orders = [
    createOrderPayload({
      customerEmail: "customer.one@localmart.demo",
      storeName: "Fresh Basket Noida",
      lines: [
        { name: "Amul Taaza Milk 1L", quantity: 2 },
        { name: "Banana Robusta 6 pcs", quantity: 1 },
        { name: "Aashirvaad Atta 5kg", quantity: 1 },
      ],
      paymentMethod: "upi",
      paymentStatus: "paid",
      paymentReference: "pay_demo_paid_001",
      paymentRecoveredAt: new Date(now - 36 * 60 * 1000),
      status: "pending",
      customerLocation: { lat: 28.5603, lng: 77.4029 },
      deliveryAddress: { line: "Tower 9, Sector 76", city: "Noida", pincode: "201301" },
      createdAt: new Date(now - 42 * 60 * 1000),
      updatedAt: new Date(now - 36 * 60 * 1000),
    }),
    createOrderPayload({
      customerEmail: "customer.two@localmart.demo",
      storeName: "Daily Pantry Express",
      lines: [
        { name: "Brown Bread 400g", quantity: 1 },
        { name: "Peanut Butter Crunchy 350g", quantity: 1 },
        { name: "Orange Juice 1L", quantity: 1 },
      ],
      paymentMethod: "razorpay",
      paymentStatus: "failed",
      paymentFailureReason: "UPI collect request timed out before confirmation.",
      paymentAttemptCount: 1,
      lastPaymentAttemptAt: new Date(now - 55 * 60 * 1000),
      status: "accepted",
      customerLocation: { lat: 28.6270, lng: 77.3649 },
      deliveryAddress: { line: "Office Tower 5, Sector 62", city: "Noida", pincode: "201309" },
      createdAt: new Date(now - 75 * 60 * 1000),
      updatedAt: new Date(now - 52 * 60 * 1000),
    }),
    createOrderPayload({
      customerEmail: "customer.three@localmart.demo",
      storeName: "Midnight Oven",
      lines: [
        { name: "Sourdough Loaf", quantity: 1 },
        { name: "Butter Croissant Box", quantity: 1 },
      ],
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      paymentAttemptCount: 1,
      lastPaymentAttemptAt: new Date(now - 28 * 60 * 1000),
      status: "preparing",
      customerLocation: { lat: 28.5448, lng: 77.3824 },
      deliveryAddress: { line: "Lotus Panache, Sector 110", city: "Noida", pincode: "201304" },
      createdAt: new Date(now - 46 * 60 * 1000),
      updatedAt: new Date(now - 20 * 60 * 1000),
    }),
    createOrderPayload({
      customerEmail: "customer.two@localmart.demo",
      storeName: "Brew & Bite Cafe",
      lines: [
        { name: "Hazelnut Cold Coffee", quantity: 1 },
        { name: "Paneer Wrap", quantity: 1 },
        { name: "Peri Peri Fries", quantity: 1 },
      ],
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "out_for_delivery",
      deliveryPartnerEmail: "driver.one@localmart.demo",
      customerLocation: { lat: 28.5708, lng: 77.3178 },
      deliveryLocation: { lat: 28.5603, lng: 77.3415 },
      estimatedDeliveryTime: 18,
      deliveryStartTime: new Date(now - 14 * 60 * 1000),
      deliveryAddress: { line: "Block B, Sector 27", city: "Noida", pincode: "201301" },
      createdAt: new Date(now - 62 * 60 * 1000),
      updatedAt: new Date(now - 3 * 60 * 1000),
    }),
    createOrderPayload({
      customerEmail: "customer.one@localmart.demo",
      storeName: "CarePlus Pharmacy",
      lines: [
        { name: "Paracetamol 650mg", quantity: 2 },
        { name: "Digital Thermometer", quantity: 1 },
      ],
      paymentMethod: "upi",
      paymentStatus: "paid",
      paymentReference: "pay_demo_paid_002",
      paymentRecoveredAt: new Date(now - 95 * 60 * 1000),
      status: "delivered",
      deliveryPartnerEmail: "driver.three@localmart.demo",
      customerLocation: { lat: 28.6270, lng: 77.3649 },
      deliveryLocation: { lat: 28.6270, lng: 77.3649 },
      estimatedDeliveryTime: 22,
      deliveryStartTime: new Date(now - 150 * 60 * 1000),
      deliveryEndTime: new Date(now - 112 * 60 * 1000),
      deliveryAddress: { line: "Plot 7, Sector 62", city: "Noida", pincode: "201309" },
      createdAt: new Date(now - 3 * 60 * 60 * 1000),
      updatedAt: new Date(now - 112 * 60 * 1000),
    }),
    createOrderPayload({
      customerEmail: "customer.three@localmart.demo",
      storeName: "HomeNest Essentials",
      lines: [
        { name: "Floor Cleaner 1L", quantity: 1 },
        { name: "Laundry Liquid 2L", quantity: 1 },
        { name: "Scrub Sponge Pack of 4", quantity: 2 },
      ],
      paymentMethod: "razorpay",
      paymentStatus: "failed",
      paymentFailureReason: "Card authentication failed during final bank step.",
      paymentAttemptCount: 2,
      lastPaymentAttemptAt: new Date(now - 23 * 60 * 60 * 1000),
      status: "cancelled",
      customerLocation: { lat: 28.5035, lng: 77.4080 },
      deliveryAddress: { line: "Ajnara Daffodil, Sector 137", city: "Noida", pincode: "201305" },
      createdAt: new Date(now - 28 * 60 * 60 * 1000),
      updatedAt: new Date(now - 22 * 60 * 60 * 1000),
    }),
    createOrderPayload({
      customerEmail: "customer.one@localmart.demo",
      storeName: "Fresh Harvest Greens",
      lines: [
        { name: "Baby Spinach 250g", quantity: 1 },
        { name: "Broccoli 500g", quantity: 1 },
        { name: "Salad Combo Box", quantity: 1 },
      ],
      paymentMethod: "upi",
      paymentStatus: "paid",
      paymentReference: "pay_demo_paid_003",
      paymentRecoveredAt: new Date(now - 8 * 60 * 60 * 1000),
      status: "accepted",
      customerLocation: { lat: 28.5196, lng: 77.4202 },
      deliveryAddress: { line: "Logix Blossom, Sector 143", city: "Noida", pincode: "201306" },
      createdAt: new Date(now - 8 * 60 * 60 * 1000),
      updatedAt: new Date(now - 7 * 60 * 60 * 1000),
    }),
    createOrderPayload({
      customerEmail: "customer.two@localmart.demo",
      storeName: "Fresh Basket Noida",
      lines: [
        { name: "Shimla Apple 1kg", quantity: 1 },
        { name: "Onion 1kg", quantity: 2 },
        { name: "Maggi Noodles Pack of 4", quantity: 2 },
      ],
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "pending",
      customerLocation: { lat: 28.5853, lng: 77.3319 },
      deliveryAddress: { line: "Sector 27 Metro Residences", city: "Noida", pincode: "201301" },
      createdAt: new Date(now - 14 * 60 * 1000),
      updatedAt: new Date(now - 12 * 60 * 1000),
    }),
    createOrderPayload({
      customerEmail: "customer.three@localmart.demo",
      storeName: "Brew & Bite Cafe",
      lines: [
        { name: "Iced Americano", quantity: 2 },
        { name: "Veg Caesar Salad", quantity: 1 },
      ],
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      paymentReference: "pay_demo_paid_004",
      paymentRecoveredAt: new Date(now - 20 * 60 * 60 * 1000),
      status: "delivered",
      deliveryPartnerEmail: "driver.four@localmart.demo",
      customerLocation: { lat: 28.5721, lng: 77.3632 },
      deliveryLocation: { lat: 28.5721, lng: 77.3632 },
      estimatedDeliveryTime: 16,
      deliveryStartTime: new Date(now - 21 * 60 * 60 * 1000),
      deliveryEndTime: new Date(now - 20 * 60 * 60 * 1000),
      deliveryAddress: { line: "Sector 50 East Block", city: "Noida", pincode: "201307" },
      createdAt: new Date(now - 22 * 60 * 60 * 1000),
      updatedAt: new Date(now - 20 * 60 * 60 * 1000),
    }),
  ];

  const insertedOrders = await Order.insertMany(orders);

  await Notification.deleteMany({ userId: { $in: customerIds } });
  await Notification.insertMany([
    {
      userId: userMap["customer.one@localmart.demo"]._id,
      type: "delivery",
      message: `Order ${String(insertedOrders[4]._id).slice(-6)} from CarePlus Pharmacy was delivered with OTP confirmation.`,
      isRead: false,
    },
    {
      userId: userMap["customer.two@localmart.demo"]._id,
      type: "order",
      message: `Your cafe order ${String(insertedOrders[3]._id).slice(-6)} is on the way with live tracking enabled.`,
      isRead: false,
    },
    {
      userId: userMap["customer.two@localmart.demo"]._id,
      type: "system",
      message: `Payment for order ${String(insertedOrders[1]._id).slice(-6)} needs another attempt. Razorpay test checkout is available on the order card.`,
      isRead: false,
    },
    {
      userId: userMap["customer.three@localmart.demo"]._id,
      type: "order",
      message: `Fresh greens order ${String(insertedOrders[6]._id).slice(-6)} was accepted and is being packed.`,
      isRead: false,
    },
    {
      userId: userMap["customer.one@localmart.demo"]._id,
      type: "system",
      message: "New stores added nearby: HomeNest Essentials and Brew & Bite Cafe now deliver to your location.",
      isRead: false,
    },
  ]);

  return { insertedOrders };
};

const seedGrowthLeads = async () => {
  await GrowthLead.deleteMany({ email: { $in: demoLeadEmails } });
  await GrowthLead.insertMany([
    {
      name: "Campus Rep One",
      email: demoLeadEmails[0],
      city: "Noida",
      useCase: "campus-waitlist",
      source: "customer-homepage",
      referralCode: "LM-CAMPUS-01",
      status: "new",
      interests: ["Campus drops", "Group orders"],
    },
    {
      name: "Flat Captain",
      email: demoLeadEmails[1],
      city: "Noida",
      useCase: "apartment-crew",
      source: "customer-homepage",
      referralCode: "LM-CREW-02",
      referredBy: "LM-NOIDA-CREW",
      status: "contacted",
      ownerNote: "Interested in tower-level launch offer and morning milk subscription.",
      interests: ["Late-night essentials", "Groceries"],
    },
    {
      name: "Creator Loop",
      email: demoLeadEmails[2],
      city: "Noida",
      useCase: "creator-community",
      source: "customer-homepage",
      status: "qualified",
      ownerNote: "Asked about recurring snack hampers for studio shoot days.",
      interests: ["Bakery", "Group orders"],
    },
    {
      name: "Everyday Essentials",
      email: demoLeadEmails[3],
      city: "Noida",
      useCase: "waitlist",
      source: "customer-homepage",
      status: "converted",
      interests: ["Pharmacy", "Groceries"],
    },
    {
      name: "Startup Pantry Lead",
      email: demoLeadEmails[4],
      city: "Noida",
      useCase: "office-pantry",
      source: "customer-homepage",
      status: "qualified",
      ownerNote: "Needs weekly pantry restock with beverages and snacks for 60 people.",
      interests: ["Office pantry", "Beverages"],
    },
    {
      name: "Late Night Loop",
      email: demoLeadEmails[5],
      city: "Noida",
      useCase: "late-night-drop",
      source: "customer-homepage",
      status: "contacted",
      ownerNote: "High response from residential clusters near Sector 76 and 137.",
      interests: ["Bakery", "Ready-to-eat", "Groceries"],
    },
  ]);
};

const seedWholesaleScenario = async (userMap) => {
  const supplier = userMap["supplier@localmart.demo"];
  const retailerIds = [
    userMap["vendor.grocery@localmart.demo"]._id,
    userMap["vendor.bakery@localmart.demo"]._id,
    userMap["vendor.cafe@localmart.demo"]._id,
    userMap["vendor.essentials@localmart.demo"]._id,
  ];

  await WholesaleProduct.deleteMany({ supplierId: supplier._id });
  const products = await WholesaleProduct.insertMany(
    wholesaleCatalog.map((product) => ({
      supplierId: supplier._id,
      name: product.name,
      pricePerUnit: product.pricePerUnit,
      minOrderQty: product.minOrderQty,
      stock: product.stock,
      category: product.category,
    }))
  );

  await WholesaleOrder.deleteMany({
    supplierId: supplier._id,
    retailerId: { $in: retailerIds },
  });

  const byName = Object.fromEntries(products.map((product) => [product.name, product]));
  await WholesaleOrder.insertMany([
    {
      retailerId: userMap["vendor.bakery@localmart.demo"]._id,
      supplierId: supplier._id,
      items: [
        { productId: byName["Premium Flour 25kg"]._id, quantity: 8, price: byName["Premium Flour 25kg"].pricePerUnit },
        { productId: byName["Cold Brew Beans 10kg"]._id, quantity: 2, price: byName["Cold Brew Beans 10kg"].pricePerUnit },
      ],
      totalAmount: byName["Premium Flour 25kg"].pricePerUnit * 8 + byName["Cold Brew Beans 10kg"].pricePerUnit * 2,
      status: "pending",
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      retailerId: userMap["vendor.grocery@localmart.demo"]._id,
      supplierId: supplier._id,
      items: [
        { productId: byName["Fresh Produce Crate"]._id, quantity: 6, price: byName["Fresh Produce Crate"].pricePerUnit },
        { productId: byName["Snack Jar Assortment"]._id, quantity: 5, price: byName["Snack Jar Assortment"].pricePerUnit },
      ],
      totalAmount: byName["Fresh Produce Crate"].pricePerUnit * 6 + byName["Snack Jar Assortment"].pricePerUnit * 5,
      status: "approved",
      createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    },
    {
      retailerId: userMap["vendor.cafe@localmart.demo"]._id,
      supplierId: supplier._id,
      items: [
        { productId: byName["Cold Brew Beans 10kg"]._id, quantity: 3, price: byName["Cold Brew Beans 10kg"].pricePerUnit },
        { productId: byName["Fresh Dairy Pack"]._id, quantity: 6, price: byName["Fresh Dairy Pack"].pricePerUnit },
      ],
      totalAmount: byName["Cold Brew Beans 10kg"].pricePerUnit * 3 + byName["Fresh Dairy Pack"].pricePerUnit * 6,
      status: "dispatched",
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    },
    {
      retailerId: userMap["vendor.essentials@localmart.demo"]._id,
      supplierId: supplier._id,
      items: [
        { productId: byName["Cleaning Combo Carton"]._id, quantity: 4, price: byName["Cleaning Combo Carton"].pricePerUnit },
      ],
      totalAmount: byName["Cleaning Combo Carton"].pricePerUnit * 4,
      status: "pending",
      createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  ]);
};

const seedFullDemoData = async () => {
  ensureSafeDemoTarget();
  const { userMap, driverMap } = await ensureDemoIdentities();
  const { storeMap, storeIds } = await seedRetailCatalog(userMap);
  await seedRetailOperations({ userMap, driverMap, storeMap, storeIds });
  await seedGrowthLeads();
  await seedWholesaleScenario(userMap);

  return getDemoStatus();
};

const seedOperationsScenario = async () => {
  ensureSafeDemoTarget();
  const { userMap, driverMap } = await ensureDemoIdentities();
  const { storeMap, storeIds } = await seedRetailCatalog(userMap);
  await seedRetailOperations({ userMap, driverMap, storeMap, storeIds });
  return getDemoStatus();
};

const seedGrowthScenario = async () => {
  ensureSafeDemoTarget();
  await seedGrowthLeads();
  return getDemoStatus();
};

const seedWholesaleOnlyScenario = async () => {
  ensureSafeDemoTarget();
  const { userMap } = await ensureDemoIdentities();
  await seedWholesaleScenario(userMap);
  return getDemoStatus();
};

const getDemoStatus = async () => {
  const demoStoreNames = storeDefinitions.map((entry) => entry.storeName);
  const demoUserEmails = demoUsers.map((entry) => entry.email);
  const demoCustomerEmails = demoUserEmails.filter((email) => email.startsWith("customer."));
  const demoStoreIds = (await Store.find({ storeName: { $in: demoStoreNames } }).select("_id")).map((entry) => entry._id);
  const demoCustomerIds = (await User.find({ email: { $in: demoCustomerEmails } }).select("_id")).map((entry) => entry._id);
  const supplierId = (await User.findOne({ email: "supplier@localmart.demo" }).select("_id"))?._id;

  const [
    users,
    drivers,
    stores,
    products,
    orders,
    notifications,
    growthLeads,
    wholesaleProducts,
    wholesaleOrders,
  ] = await Promise.all([
    User.countDocuments({ email: { $in: demoUserEmails } }),
    Driver.countDocuments({ email: /@localmart\.demo$/i }),
    Store.countDocuments({ storeName: { $in: demoStoreNames } }),
    Product.countDocuments({ storeId: { $in: demoStoreIds } }),
    Order.countDocuments({
      $or: [
        { customerId: { $in: demoCustomerIds } },
        { storeId: { $in: demoStoreIds } },
      ],
    }),
    Notification.countDocuments({ userId: { $in: demoCustomerIds } }),
    GrowthLead.countDocuments({ email: { $in: demoLeadEmails } }),
    WholesaleProduct.countDocuments({ supplierId }),
    WholesaleOrder.countDocuments({ supplierId }),
  ]);

  return {
    safeToSeed: looksLikeSafeDemoDatabase(process.env.MONGO_URI || ""),
    credentials: demoCredentials,
    counts: {
      users,
      drivers,
      stores,
      products,
      orders,
      notifications,
      growthLeads,
      wholesaleProducts,
      wholesaleOrders,
    },
  };
};

module.exports = {
  demoCredentials,
  looksLikeSafeDemoDatabase,
  ensureSafeDemoTarget,
  getDemoStatus,
  seedFullDemoData,
  seedOperationsScenario,
  seedGrowthScenario,
  seedWholesaleOnlyScenario,
};
