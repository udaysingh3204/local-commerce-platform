import { useState } from "react"
import API from "../api/api"

export default function CreateStore() {

  const [storeName, setStoreName] = useState("")
  const [category, setCategory] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")

  const handleSubmit = async (e:any) => {
    e.preventDefault()

    try {

      const res = await API.post("/stores", {
        storeName,
        vendorId: "65f123456789abcdef123456", // temporary
        category,
        location: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)]
        }
      })

      alert("Store Created!")

      console.log(res.data)

    } catch (err) {
      console.error(err)
      alert("Error creating store")
    }

  }

  return (

    <div>

      <h2>Create Store</h2>

      <form onSubmit={handleSubmit}>

        <div>
          <label>Store Name</label>
          <input
            value={storeName}
            onChange={(e)=>setStoreName(e.target.value)}
          />
        </div>

        <div>
          <label>Category</label>
          <input
            value={category}
            onChange={(e)=>setCategory(e.target.value)}
          />
        </div>

        <div>
          <label>Latitude</label>
          <input
            value={lat}
            onChange={(e)=>setLat(e.target.value)}
          />
        </div>

        <div>
          <label>Longitude</label>
          <input
            value={lng}
            onChange={(e)=>setLng(e.target.value)}
          />
        </div>

        <button type="submit">Create Store</button>

      </form>

    </div>

  )
}