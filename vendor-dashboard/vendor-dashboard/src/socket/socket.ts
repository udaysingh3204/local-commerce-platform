import { io } from "socket.io-client"
import { BACKEND_ORIGIN } from "../api/api"

const socket = io(BACKEND_ORIGIN)

export default socket