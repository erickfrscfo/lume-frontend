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
  obligations: (horizonDays: number = 120, type?: 'PAYABLE' | 'RECEIVABLE' | 'all', status?: string) => {
    let url = `/financial/obligations?horizonDays=${horizonDays}`;
    if (type && type !== 'all') url += `&type=${type}`;
    if (status && status !== 'all') url += `&status=${status}`;
    return api.get(url);
  },
  transactions: (page?: number, type?: string, startDate?: string, endDate?: string, status?: string, dueDateStart?: string, dueDateEnd?: string) => {
    let url = `/financial/transactions?page=${page || 1}&limit=50`;
    if (type) url += `&type=${type}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (status) url += `&status=${status}`;
    if (dueDateStart) url += `&dueDateStart=${dueDateStart}`;
    if (dueDateEnd) url += `&dueDateEnd=${dueDateEnd}`;
    return api.get(url);
  },
  createTransaction: (data: {
    date: string;
    description: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    categoryId?: string;
    categoryCode?: string;
    notes?: string;
  }) => api.post('/financial/transactions', data),
  deleteTransaction: (id: string) => api.delete(`/financial/transactions/${id}`),
  updateTransaction: (id: string, data: Record<string, any>) =>
    api.patch(`/financial/transactions/${id}`, data),
// NOVO: Buscar breakdown de custos
 costBreakdown: (months: number = 6) =>
   api.get(`/financial/cost-breakdown?months=${months}`),
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
  chat: (message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>, systemPrompt?: string) =>
    api.post('/ai/chat', { message, history, ...(systemPrompt ? { systemPrompt } : {}) }),
  explain: (metric: string, value: string, context?: string) =>
    api.post('/ai/explain', { metric, value, context }),
  chatHistory: () => api.get('/ai/chat/history'),
// NOVO: Buscar classificações pendentes
 getPendingCostClassifications: () =>
   api.get('/ai/pending-cost-classifications'),
// NOVO: Classificar tipo de custo
 classifyCostType: (transactionIds: string[]) =>
   api.post('/ai/classify-cost-type', { transactionIds }),
// NOVO: Atualizar tipo de custo manualmente
 updateCostType: (transactionId: string, costType: 'FIXO' | 'VARIAVEL') =>
   api.put(`/ai/update-cost-type/${transactionId}`, { costType }),
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
  aiChat: (message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    api.post('/scenarios/ai-chat', { message, history }),
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
// TRANSACTIONS (Conciliação)
// ============================================
export const transactionsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    tipo_transacao?: string;
    status?: string;
    reconciliationStatus?: string;
    counterpartyId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const qs = searchParams.toString();
    return api.get(`/transactions${qs ? `?${qs}` : ''}`);
  },
  markPaid: (id: string, data: { paymentDate?: string; amountPaid?: number }) =>
    api.patch(`/transactions/${id}/mark-paid`, data),
  markReceived: (id: string, data: { receiptDate?: string; amountReceived?: number }) =>
    api.patch(`/transactions/${id}/mark-received`, data),
};

// ============================================
// COUNTERPARTIES (Contrapartes)
// ============================================
export const counterpartiesApi = {
  list: (params?: { type?: string; isActive?: boolean; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const qs = searchParams.toString();
    return api.get(`/counterparties${qs ? `?${qs}` : ''}`);
  },
  create: (data: {
    name: string;
    document?: string;
    type?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }) => api.post('/counterparties', data),
  update: (id: string, data: Record<string, any>) => api.put(`/counterparties/${id}`, data),
  delete: (id: string) => api.delete(`/counterparties/${id}`),
};

// ============================================
// RECONCILIATIONS (Conciliação)
// ============================================
export const reconciliationsApi = {
  dashboard: () => api.get('/reconciliations/dashboard'),
  batchReconcile: (data: { items: Array<{ transactionId: string }>; notes?: string }) =>
    api.post('/reconciliations/batch', data),
};

// ============================================
// DOCUMENTS (Documentos Fiscais)
// ============================================
export const documentsApi = {
  list: (params?: { type?: string; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const qs = searchParams.toString();
    return api.get(`/documents${qs ? `?${qs}` : ''}`);
  },
  create: (data: {
    number: string;
    type: string;
    description?: string;
    amount?: number;
    issueDate?: string;
    dueDate?: string;
    counterpartyId?: string;
    notes?: string;
  }) => api.post('/documents', data),
  update: (id: string, data: Record<string, any>) => api.put(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

// ============================================
// INSIGHTS (Insights IA)
// ============================================
export const insightsApi = {
  list: (params?: { severity?: string; isDismissed?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const qs = searchParams.toString();
    return api.get(`/insights${qs ? `?${qs}` : ''}`);
  },
  markRead: (id: string) => api.patch(`/insights/${id}/read`),
  dismiss: (id: string) => api.patch(`/insights/${id}/dismiss`),
};

// ============================================
// HEALTH
// ============================================
export const healthApi = {
  check: () => api.get('/health'),
};

// ============================================
// CATEGORIES (Plano de Contas)
// ============================================
export const categoriesApi = {
  /** Lista todas as categorias do plano de contas da empresa */
  list: () => api.get('/categories'),
};

// ============================================
// REPORT (Relatório Dinâmico)
// ============================================
export const reportApi = {
  /** Lista indicadores disponíveis (padrão + custom), agrupados por categoria */
  getIndicators: () => api.get('/report/indicators'),

  /** Retorna o template salvo da empresa (indicadores selecionados + ordem) */
  getTemplate: () => api.get('/report/template'),

  /** Salva/atualiza o template (indicadores selecionados + ordem) */
  saveTemplate: (data: {
    indicators: Array<{ id: string; type: string; order: number }>;
    name?: string;
    referenceMonth?: string;
  }) => api.put('/report/template', data),

  /** Calcula os valores reais dos indicadores selecionados */
  generate: (data: { month: string; indicatorIds: string[] }) =>
    api.post('/report/generate', data),

  /** Cria indicador customizado via IA */
  createCustomIndicator: (data: { description: string }) =>
    api.post('/report/indicators/custom', data),

  /** Remove indicador customizado (soft delete) */
  deleteCustomIndicator: (id: string) =>
    api.delete(`/report/indicators/custom/${id}`),
};

export default api;
