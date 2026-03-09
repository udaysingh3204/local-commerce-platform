import { useEffect, useState } from "react";
import API from "../api/api";
import type { Product } from "../types/product";

export default function Products() {

  const [products, setProducts] = useState<Product[]>([])

  const [form, setForm] = useState<Product>({
    name: "",
    price: 0,
    stock: 0,
    category: "",
    storeId: "69a9e3da81a8685ca09a5b17"
  })

  const fetchProducts = async () => {
    const res = await API.get(`/products/store/${form.storeId}`)
    setProducts(res.data)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleChange = (e: any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const addProduct = async () => {
    await API.post("/products/create", form)
    fetchProducts()
  }

  const deleteProduct = async (id: string) => {
    await API.delete(`/products/${id}`)
    fetchProducts()
  }

  return (
    <div className="p-10 bg-gray-100 min-h-screen">

      <h1 className="text-3xl font-bold mb-6">
        Product Manager
      </h1>

      {/* Add Product Form */}

      <div className="bg-white p-6 rounded-xl shadow mb-8">

        <h2 className="font-bold mb-4">Add Product</h2>

        <div className="grid grid-cols-4 gap-4">

          <input
            name="name"
            placeholder="Product Name"
            onChange={handleChange}
            className="border p-2 rounded"
          />

          <input
            name="price"
            placeholder="Price"
            type="number"
            onChange={handleChange}
            className="border p-2 rounded"
          />

          <input
            name="stock"
            placeholder="Stock"
            type="number"
            onChange={handleChange}
            className="border p-2 rounded"
          />

          <input
            name="category"
            placeholder="Category"
            onChange={handleChange}
            className="border p-2 rounded"
          />

        </div>

        <button
          onClick={addProduct}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add Product
        </button>

      </div>

      {/* Product List */}

      <div className="bg-white p-6 rounded-xl shadow">

        <h2 className="font-bold mb-4">Products</h2>

        <table className="w-full">

          <thead>
            <tr className="text-left border-b">
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {products.map((p) => (

              <tr key={p._id} className="border-b">

                <td>{p.name}</td>
                <td>₹{p.price}</td>
                <td>{p.stock}</td>

                <td>
                  <button
                    onClick={() => deleteProduct(p._id!)}
                    className="text-red-500"
                  >
                    Delete
                  </button>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  )
}