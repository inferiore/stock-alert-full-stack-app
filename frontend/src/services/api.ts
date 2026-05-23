import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({ baseURL: API_URL });

// Attach JWT to every request automatically
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string };
}

export const authApi = {
  register: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/register', { email, password }),
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }),
};

export interface CandlePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface QuotePoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
}

export const stocksApi = {
  getQuote: (symbol: string): Promise<QuotePoint> =>
    apiClient.get<QuotePoint>(`/stocks/${symbol}/quote`).then((r) => r.data),
  getCandles: (symbol: string): Promise<CandlePoint[]> =>
    apiClient.get<CandlePoint[]>(`/stocks/${symbol}/candles`).then((r) => r.data),
};

export const usersApi = {
  updateFcmToken: (fcmToken: string) =>
    apiClient.put('/users/fcm-token', { fcmToken }),
};

export const alertsApi = {
  getAll: () => apiClient.get('/alerts').then((r) => r.data),
  create: (data: { symbol: string; targetPrice: number; condition: 'above' | 'below' }) =>
    apiClient.post('/alerts', data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/alerts/${id}`),
};
