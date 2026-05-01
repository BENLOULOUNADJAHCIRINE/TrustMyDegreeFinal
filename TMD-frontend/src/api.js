import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let keepAliveInterval = null;

function startKeepAlive() {
  if (keepAliveInterval) return;                          
  const BASE = process.env.REACT_APP_API_URL;
  if (!BASE) return;
  keepAliveInterval = setInterval(() => {
    fetch(`${BASE}/api/health`).catch(() => {});          
  }, 14 * 60 * 1000);                                    
}

function stopKeepAlive() {
  clearInterval(keepAliveInterval);
  keepAliveInterval = null;
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopKeepAlive();
  else startKeepAlive();
});

startKeepAlive();

export default api;
