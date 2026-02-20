import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://lume-mvp-production.up.railway.app';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor para adicionar token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lume_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('lume_token');
      localStorage.removeItem('lume_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH
// ============================================
export const authApi = {
  register: (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    company: { name: string; cnpj: string; sector: string };
  }) => api.post('/auth/register', data),

  login: (data: { username: string; password: string; companyCode: string }) =>
    api.post('/auth/login', data),

  me: () => api.get('/auth/me'),
};

// ============================================
// FINANCIAL
// ============================================
export const financialApi = {
  dashboard: () => api.get('/financial/dashboard'),
  cashflow: (months?: number) => api.get(`/financial/cashflow?months=${months || 12}`),
  dre: (months?: number) => api.get(`/financial/dre?months=${months || 7}`),
  transactions: (page?: number, type?: string, startDate?: string, endDate?: string) => {
    let url = `/financial/transactions?page=${page || 1}&limit=50`;
    if (type) url += `&type=${type}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return api.get(url);
  },
  createTransaction: (data: {
    date: string;
    description: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    categoryId?: string;
    notes?: string;
  }) => api.post('/financial/transactions', data),
  deleteTransaction: (id: string) => api.delete(`/financial/transactions/${id}`),
// NOVO: Buscar breakdown de custos
 costBreakdown: (months: number = 6) =>
 api.get(`/api/financial/cost-breakdown?months=${months}`),
};

// ============================================
// UPLOAD
// ============================================
export const uploadApi = {
  csv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 min para classificação IA de muitas transações
    });
  },
  history: () => api.get('/upload/history'),
};

// ============================================
// AI
// ============================================
export const aiApi = {
  chat: (message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    api.post('/ai/chat', { message, history }),
  explain: (metric: string, value: string, context?: string) =>
    api.post('/ai/explain', { metric, value, context }),
  chatHistory: () => api.get('/ai/chat/history'),
// NOVO: Buscar classificações pendentes
 getPendingCostClassifications: ( ) =>
 api.get('/api/ai/pending-cost-classifications'),
// NOVO: Classificar tipo de custo
 classifyCostType: (transactionIds: string[]) =>
 api.post('/api/ai/classify-cost-type', { transactionIds }),
// NOVO: Atualizar tipo de custo manualmente
 updateCostType: (transactionId: string, costType: 'FIXO' | 'VARIAVEL') =>
 api.put(`/api/ai/update-cost-type/${transactionId}`, { costType }),
};

// ============================================
// SCENARIOS
// ============================================
export const scenariosApi = {
  list: () => api.get('/scenarios'),
  create: (data: {
    name: string;
    type: 'PROJECT' | 'ORGANIZATIONAL_CHANGE' | 'INVESTMENT' | 'DIVESTMENT';
    description?: string;
    adjustments: Record<string, any>;
    isActive?: boolean;
  }) => api.post('/scenarios', data),
  update: (id: string, data: Record<string, any>) => api.put(`/scenarios/${id}`, data),
  toggle: (id: string) => api.patch(`/scenarios/${id}/toggle`),
  delete: (id: string) => api.delete(`/scenarios/${id}`),
};

// ============================================
// ALERTS
// ============================================
export const alertsApi = {
  list: () => api.get('/alerts'),
  markRead: (id: string) => api.patch(`/alerts/${id}/read`),
  dismiss: (id: string) => api.patch(`/alerts/${id}/dismiss`),
  generate: () => api.post('/alerts/generate'),
};

// ============================================
// FORECAST
// ============================================
export const forecastApi = {
  get: (months: number = 6, scenario: string = 'realistic') =>
    api.get(`/forecast?months=${months}&scenario=${scenario}`),
};

// ============================================
// HEALTH
// ============================================
export const healthApi = {
  check: () => api.get('/health'),
};

export default api;
