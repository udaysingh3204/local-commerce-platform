import { io } from "socket.io-client"

const socket = io("https://local-commerce-platform-production.up.railway.app/")

export default socket