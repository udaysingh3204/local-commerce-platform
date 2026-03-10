import axios from "axios";

const API = axios.create({
  baseURL: "https://local-commerce-platform-production.up.railway.app/api"
});

export default API;