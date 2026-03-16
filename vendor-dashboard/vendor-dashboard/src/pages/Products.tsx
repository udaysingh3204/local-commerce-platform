import { useEffect, useState } from "react"
import API from "../api/api"
import type { Product } from "../types/product"

export default function Products(){

const storeId = "69a9e3da81a8685ca09a5b17"

const [products,setProducts] = useState<Product[]>([])
const [search,setSearch] = useState("")

const [form,setForm] = useState<Product>({
name:"",
price:0,
stock:0,
category:"",
image:"",
storeId
})

const [imageFile,setImageFile] = useState<File | null>(null)
const [imagePreview,setImagePreview] = useState("")
const [editingProduct,setEditingProduct] = useState<Product | null>(null)

const fetchProducts = async()=>{
const res = await API.get(`/products/store/${storeId}`)
setProducts(res.data)
}

useEffect(()=>{
fetchProducts()
},[])

const handleChange = (e:React.ChangeEvent<HTMLInputElement>)=>{
setForm({
...form,
[e.target.name]: e.target.value
})
}

const handleImageChange = (e:React.ChangeEvent<HTMLInputElement>)=>{
const file = e.target.files?.[0]
if(file){
setImageFile(file)
setImagePreview(URL.createObjectURL(file))
}
}

const addProduct = async()=>{

let imageUrl=""

if(imageFile){

const formData=new FormData()
formData.append("image",imageFile)

const uploadRes = await API.post(
"/upload",
formData
)

imageUrl = uploadRes.data.imageUrl

}

await API.post("/products/create",{
...form,
image:imageUrl
})

setForm({
name:"",
price:0,
stock:0,
category:"",
image:"",
storeId
})

setImagePreview("")
setImageFile(null)

fetchProducts()

}

const deleteProduct = async(id:string)=>{
await API.delete(`/products/${id}`)
fetchProducts()
}

const openEdit = (product:Product)=>{
setEditingProduct(product)
}

const updateProduct = async()=>{
if(!editingProduct) return

await API.put(`/products/${editingProduct._id}`,editingProduct)

setEditingProduct(null)
fetchProducts()
}

return(

<div className="p-10 bg-gray-100 min-h-screen">

<div className="flex justify-between mb-8">
<h1 className="text-3xl font-bold">Products</h1>

<button
onClick={fetchProducts}
className="bg-gray-200 px-4 py-2 rounded"
>
Refresh
</button>
</div>


{/* METRICS */}

<div className="grid grid-cols-3 gap-6 mb-8">

<div className="bg-white p-6 rounded-xl shadow">
<h3 className="text-gray-500">Total Products</h3>
<p className="text-2xl font-bold">{products.length}</p>
</div>

<div className="bg-white p-6 rounded-xl shadow">
<h3 className="text-gray-500">Low Stock</h3>
<p className="text-2xl font-bold">
{products.filter(p=>p.stock<5).length}
</p>
</div>

<div className="bg-white p-6 rounded-xl shadow">
<h3 className="text-gray-500">Inventory Value</h3>
<p className="text-2xl font-bold">
₹{products.reduce((sum,p)=>sum+p.price*p.stock,0)}
</p>
</div>

</div>


{/* ADD PRODUCT */}

<div className="bg-white p-6 rounded-xl shadow mb-8">

<h2 className="font-semibold mb-4">Add Product</h2>

<div className="grid grid-cols-5 gap-4">

<input name="name" value={form.name} placeholder="Name"
onChange={handleChange} className="border p-2 rounded"/>

<input name="price" type="number" value={form.price}
placeholder="Price" onChange={handleChange}
className="border p-2 rounded"/>

<input name="stock" type="number" value={form.stock}
placeholder="Stock" onChange={handleChange}
className="border p-2 rounded"/>

<input name="category" value={form.category}
placeholder="Category" onChange={handleChange}
className="border p-2 rounded"/>

<input type="file"
onChange={handleImageChange}
className="border p-2 rounded"/>

</div>

{imagePreview && (
<img
src={imagePreview}
className="w-24 h-24 object-cover rounded mt-4"
/>
)}

<button
onClick={addProduct}
className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
>
Add Product
</button>

</div>


{/* TABLE */}

<div className="bg-white p-6 rounded-xl shadow">

<input
placeholder="Search..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
className="border p-2 rounded mb-4"
/>

<table className="w-full">

<thead>

<tr className="border-b text-gray-500 text-sm">

<th>Image</th>
<th>Name</th>
<th>Price</th>
<th>Stock</th>
<th>Category</th>
<th>Action</th>

</tr>

</thead>

<tbody>

{products
.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()))
.map(p=>(

<tr key={p._id} className="border-b">

<td>
<img
src={p.image || "https://via.placeholder.com/50"}
className="w-12 h-12 object-cover rounded"
/>
</td>

<td>{p.name}</td>
<td>₹{p.price}</td>

<td>
<span className={`px-2 py-1 rounded text-sm
${p.stock<5?"bg-red-100 text-red-600":"bg-green-100 text-green-600"}
`}>
{p.stock}
</span>
</td>

<td>{p.category}</td>

<td className="flex gap-3">

<button
onClick={()=>openEdit(p)}
className="text-blue-600"
>
Edit
</button>

<button
onClick={()=>deleteProduct(p._id!)}
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


{/* EDIT MODAL */}

{editingProduct && (

<div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">

<div className="bg-white p-8 rounded-xl w-96">

<h2 className="text-xl font-bold mb-4">Edit Product</h2>

<input
value={editingProduct.name}
onChange={(e)=>setEditingProduct({...editingProduct,name:e.target.value})}
className="border p-2 rounded w-full mb-3"
/>

<input
type="number"
value={editingProduct.price}
onChange={(e)=>setEditingProduct({...editingProduct,price:Number(e.target.value)})}
className="border p-2 rounded w-full mb-3"
/>

<input
type="number"
value={editingProduct.stock}
onChange={(e)=>setEditingProduct({...editingProduct,stock:Number(e.target.value)})}
className="border p-2 rounded w-full mb-3"
/>

<input
value={editingProduct.category}
onChange={(e)=>setEditingProduct({...editingProduct,category:e.target.value})}
className="border p-2 rounded w-full mb-4"
/>

<div className="flex justify-end gap-3">

<button
onClick={()=>setEditingProduct(null)}
className="px-4 py-2 bg-gray-200 rounded"
>
Cancel
</button>

<button
onClick={updateProduct}
className="px-4 py-2 bg-blue-600 text-white rounded"
>
Update
</button>

</div>

</div>

</div>

)}

</div>

)

}