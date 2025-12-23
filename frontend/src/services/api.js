import axios from "axios";

// Configuration
const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to delay retry attempts
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Check if error is retryable
const isRetryable = (error) => {
  // Retry on network errors or 5xx server errors
  if (!error.response) return true; // Network error
  const status = error.response?.status;
  return status >= 500 && status < 600;
};

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Track retry count
    config.__retryCount = config.__retryCount || 0;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors and retries
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Handle auth errors
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      const role = error.response?.data?.role || localStorage.getItem("role");
      const redirect = role === "merchant" ? "/merchant-login" : "/customer-login";
      if (typeof window !== "undefined") {
        window.location.replace(redirect);
      }
      return Promise.reject(error);
    }

    // Retry logic for network/server errors
    if (isRetryable(error) && config && config.__retryCount < MAX_RETRIES) {
      config.__retryCount += 1;
      console.log(`Retrying request (${config.__retryCount}/${MAX_RETRIES}):`, config.url);
      await delay(RETRY_DELAY * config.__retryCount); // Exponential backoff
      return api(config);
    }

    // Enhanced error object
    const enhancedError = {
      ...error,
      isNetworkError: !error.response,
      isTimeout: error.code === 'ECONNABORTED',
      userMessage: getErrorMessage(error),
    };

    return Promise.reject(enhancedError);
  }
);

// Get user-friendly error message
const getErrorMessage = (error) => {
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }
  if (!error.response) {
    return 'Network error. Please check your connection.';
  }
  const status = error.response?.status;
  const serverMessage = error.response?.data?.message;
  
  if (serverMessage) return serverMessage;
  
  switch (status) {
    case 400: return 'Invalid request. Please check your input.';
    case 404: return 'Resource not found.';
    case 429: return 'Too many requests. Please wait a moment.';
    case 500: return 'Server error. Please try again later.';
    default: return 'Something went wrong. Please try again.';
  }
};

export const setSession = ({ token, role }) => {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
};

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
};

export const signupCustomer = (payload) => api.post("/auth/signup/customer", payload);
export const signupMerchant = (payload) => api.post("/auth/signup/merchant", payload);
export const loginUser = (payload) => api.post("/auth/login", payload);
export const requestOtp = (payload) => api.post("/auth/otp/request", payload);
export const verifyOtpCode = (payload) => api.post("/auth/otp/verify", payload);
export const forgotPassword = (payload) => api.post("/auth/forgot-password", payload);
export const resetPassword = (payload) => api.post("/auth/reset-password", payload);

export const fetchCustomerReceipts = (page = 1, limit = 50) => 
  api.get(`/receipts/customer?page=${page}&limit=${limit}`);
export const fetchMerchantReceipts = (page = 1, limit = 50) => 
  api.get(`/receipts/merchant?page=${page}&limit=${limit}`);
export const createReceipt = (payload) => api.post("/receipts", payload);
export const claimReceipt = (payload) => api.post("/receipts/claim", payload);
export const markReceiptPaid = (id) => api.patch(`/receipts/${id}/mark-paid`);
export const updateReceipt = (id, payload) => api.patch(`/receipts/${id}`, payload);
export const deleteReceipt = (id) => api.delete(`/receipts/${id}`);
export const getReceiptById = (id) => api.get(`/receipts/${id}`);
export const fetchCustomerAnalytics = () => api.get("/analytics/customer");
export const fetchMerchantAnalytics = () => api.get("/analytics/merchant");
export const fetchProfile = () => api.get("/auth/me");
export const updateProfile = (payload) => api.patch("/auth/me", payload);
export const changePassword = (payload) => api.post("/auth/change-password", payload);
export const deleteAccount = () => api.delete("/auth/me");

export default api;
