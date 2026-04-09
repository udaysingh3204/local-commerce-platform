import { useEffect, useState } from "react";
import API from "../api/api";
import type { Analytics } from "../types/analytics";
import { useVendor } from "../context/VendorContext";

export default function Dashboard() {

  const { store } = useVendor();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    if (!store) return;
    API.get(`/analytics/store/${store._id}`)
      .then(res => setAnalytics(res.data))
      .catch(err => console.log(err));
  }, [store]);

  return (
    <div className="p-10 bg-gray-100 min-h-screen">

      <h1 className="text-3xl font-bold mb-8">
        Vendor Dashboard
      </h1>

      {analytics && (

        <div className="grid grid-cols-3 gap-6">

          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500">Total Orders</p>
            <h2 className="text-2xl font-bold">
              {analytics.totalOrders}
            </h2>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500">Total Revenue</p>
            <h2 className="text-2xl font-bold">
              ₹{analytics.totalRevenue}
            </h2>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500">Today's Orders</p>
            <h2 className="text-2xl font-bold">
              {analytics.todayOrders}
            </h2>
          </div>

        </div>

      )}

    </div>
  );
}