import axios from 'axios';

// In production/Docker, use relative path since frontend and backend are served from the same origin
// In development, use the configured API URL or default to localhost:3001
const getApiBaseUrl = () => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production, use relative path (same origin)
  if (import.meta.env.PROD || import.meta.env.MODE === 'production') {
    return '/api';
  }
  
  // In development, use default
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 120 seconds for LLM requests
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('supabase.auth.token');
  if (token) {
    try {
      const session = JSON.parse(token);
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - try to refresh or redirect to login
      console.warn('Authentication failed, attempting to refresh token...');
      
      // Try to refresh the session
      try {
        const { supabase } = await import('../App');
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && session) {
          // Update stored token
          localStorage.setItem('supabase.auth.token', JSON.stringify(session));
          // Retry the original request
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${session.access_token}`;
            return apiClient.request(error.config);
          }
        } else {
          // Refresh failed - redirect to login
          console.error('Token refresh failed, redirecting to login');
          localStorage.removeItem('supabase.auth.token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } catch (refreshErr) {
        console.error('Error refreshing token:', refreshErr);
        localStorage.removeItem('supabase.auth.token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    if (error.code === 'ECONNABORTED') {
      error.message = '请求超时，请稍后重试';
    } else if (error.message === 'Network Error') {
      error.message = '网络连接失败，请检查后端服务是否运行';
    } else if (!error.response) {
      error.message = '无法连接到服务器，请检查网络连接';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

