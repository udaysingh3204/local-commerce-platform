import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import "leaflet/dist/leaflet.css"
import { AuthProvider } from "./context/AuthContext"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "sonner"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <BrowserRouter>
      <App />
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  </AuthProvider>
)