import { io } from "socket.io-client"
import { BACKEND_ORIGIN } from "../api/api"

const socket = io(BACKEND_ORIGIN, {
  auth: { token: localStorage.getItem("vendorToken") },
  autoConnect: false,
})

export default socket
