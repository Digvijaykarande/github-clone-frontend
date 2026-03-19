import axios from "axios";

const API = axios.create({
  baseURL: "https://mygithubclone-hwbue4edhmb2cceh.centralindia-01.azurewebsites.net",
});

// Request interceptor - attach token
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  console.log("SENDING TOKEN:", token);
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// ✅ Response interceptor - handle expired token
API.interceptors.response.use(
  (response) => response, // pass through successful responses
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid
      localStorage.clear();
      window.location.href = "/login"; // force redirect to login
    }
    return Promise.reject(error);
  }
);

export default API;