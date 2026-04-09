import { io } from "socket.io-client"

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "https://local-commerce-platform-production.up.railway.app"
const socket = io(SOCKET_URL)

export default socket