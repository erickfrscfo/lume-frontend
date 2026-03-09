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
  costBreakdown: (months: number = 6) =>
    api.get(`/financial/cost-breakdown?months=${months}`),
};

// ============================================
// TRANSACTIONS (Conciliação - Expandido)
// ============================================
export const transactionsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    tipo_transacao?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    reconciliationStatus?: string;
    status?: string;
    counterpartyId?: string;
    source?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.append(key, String(value));
        }
      });
    }
    return api.get(`/transactions?${query.toString()}`);
  },

  summary: (params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    return api.get(`/transactions/summary?${query.toString()}`);
  },

  getById: (id: string) => api.get(`/transactions/${id}`),

  update: (id: string, data: {
    description?: string;
    amount?: number;
    date?: string;
    tipo_transacao?: 'INCOME' | 'EXPENSE';
    categoryId?: string;
    counterpartyId?: string;
    notes?: string;
    status?: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'PARTIAL';
  }) => api.patch(`/transactions/${id}`, data),

  createDetail: (transactionId: string, data: {
    counterpartyId?: string;
    dueDate?: string;
    paymentDate?: string;
    documentNumber?: string;
    bankReference?: string;
    notes?: string;
    amountOriginal?: number;
    amountPaid?: number;
    discount?: number;
    interest?: number;
  }) => api.post(`/transactions/${transactionId}/detail`, data),

  updateDetail: (transactionId: string, detailId: string, data: {
    counterpartyId?: string;
    dueDate?: string;
    paymentDate?: string;
    receiptDate?: string;
    documentNumber?: string;
    bankReference?: string;
    notes?: string;
    amountOriginal?: number;
    amountPaid?: number;
    amountReceived?: number;
    discount?: number;
    interest?: number;
  }) => api.patch(`/transactions/${transactionId}/detail/${detailId}`, data),

  // Mark as paid (EXPENSE)
  markPaid: (id: string, data: {
    paymentDate?: string;
    amountPaid?: number;
    bankReference?: string;
    notes?: string;
  }) => api.post(`/transactions/${id}/mark-paid`, data),

  // Mark as received (INCOME)
  markReceived: (id: string, data: {
    receiptDate?: string;
    amountReceived?: number;
    bankReference?: string;
    notes?: string;
  }) => api.post(`/transactions/${id}/mark-received`, data),
};

// ============================================
// COUNTERPARTIES (Contrapartes - Expandido)
// ============================================
export const counterpartiesApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
    isActive?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.append(key, String(value));
        }
      });
    }
    return api.get(`/counterparties?${query.toString()}`);
  },

  getById: (id: string) => api.get(`/counterparties/${id}`),

  // Métricas e histórico de uma contraparte
  getMetrics: (id: string) => api.get(`/counterparties/${id}/metrics`),
  getHistory: (id: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    return api.get(`/counterparties/${id}/history?${query.toString()}`);
  },

  create: (data: {
    name: string;
    document?: string;
    type?: 'SUPPLIER' | 'CLIENT' | 'BOTH';
    email?: string;
    phone?: string;
    notes?: string;
  }) => api.post('/counterparties', data),

  update: (id: string, data: {
    name?: string;
    document?: string;
    type?: 'SUPPLIER' | 'CLIENT' | 'BOTH';
    email?: string;
    phone?: string;
    notes?: string;
    isActive?: boolean;
  }) => api.patch(`/counterparties/${id}`, data),

  delete: (id: string) => api.delete(`/counterparties/${id}`),
};

// ============================================
// DOCUMENTS (Documentos Fiscais)
// ============================================
export const documentsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    counterpartyId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.append(key, String(value));
        }
      });
    }
    return api.get(`/documents?${query.toString()}`);
  },

  getById: (id: string) => api.get(`/documents/${id}`),

  create: (data: {
    type: 'INVOICE' | 'RECEIPT' | 'BANK_STATEMENT' | 'CONTRACT' | 'OTHER';
    number: string;
    issueDate: string;
    amount: number;
    description?: string;
    counterpartyId?: string;
    fileUrl?: string;
  }) => api.post('/documents', data),

  update: (id: string, data: {
    number?: string;
    issueDate?: string;
    amount?: number;
    description?: string;
    counterpartyId?: string;
    fileUrl?: string;
    status?: 'ACTIVE' | 'CANCELLED' | 'ARCHIVED';
  }) => api.patch(`/documents/${id}`, data),

  delete: (id: string) => api.delete(`/documents/${id}`),
};

// ============================================
// RECONCILIATIONS (Conciliações - Expandido)
// ============================================
export const reconciliationsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    method?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.append(key, String(value));
        }
      });
    }
    return api.get(`/reconciliations?${query.toString()}`);
  },

  dashboard: () => api.get('/reconciliations/dashboard'),

  reconcile: (data: {
    transactionId: string;
    documentId?: string;
    counterpartyId?: string;
    notes?: string;
    proofDescription?: string;
    bankTransactionRef?: string;
    bankTransactionDate?: string;
    bankTransactionAmount?: number;
  }) => api.post('/reconciliations', data),

  batchReconcile: (data: {
    items: Array<{
      transactionId: string;
      documentId?: string;
      counterpartyId?: string;
    }>;
    notes?: string;
  }) => api.post('/reconciliations/batch', data),

  // Confirmar/rejeitar sugestão de conciliação
  confirm: (id: string) => api.patch(`/reconciliations/${id}/confirm`),
  reject: (id: string) => api.patch(`/reconciliations/${id}/reject`),

  undo: (id: string) => api.delete(`/reconciliations/${id}`),
};

// ============================================
// INSIGHTS (Smart Alerts / AI Insights)
// ============================================
export const insightsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    insightType?: string;
    severity?: string;
    isRead?: boolean;
    isDismissed?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.append(key, String(value));
        }
      });
    }
    return api.get(`/insights?${query.toString()}`);
  },

  summary: () => api.get('/insights/summary'),

  getById: (id: string) => api.get(`/insights/${id}`),

  markRead: (id: string) => api.patch(`/insights/${id}/read`),

  dismiss: (id: string) => api.patch(`/insights/${id}/dismiss`),

  readAll: () => api.post('/insights/read-all'),

  dismissAll: (params?: { insightType?: string; severity?: string }) =>
    api.post('/insights/dismiss-all', params || {}),
};

// ============================================
// UPLOAD (CSV expandido com 9 colunas)
// ============================================
export const uploadApi = {
  csv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    });
  },
  history: () => api.get('/upload/history'),
  // Download template CSV com 9 colunas
  downloadTemplate: () => {
    const headers = 'data,descricao,valor,tipo,categoria,contraparte,documento_numero,vencimento,referencia_bancaria';
    const example1 = '2025-03-01,Pagamento Fornecedor X,1500.00,EXPENSE,5.0,Fornecedor X,NF-001,2025-03-15,TED-123456';
    const example2 = '2025-03-05,Recebimento Cliente Y,5000.00,INCOME,1.2,Cliente Y,NF-002,2025-03-05,PIX-789012';
    const csv = `${headers}\n${example1}\n${example2}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_transacoes_lume.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
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
  getPendingCostClassifications: () =>
    api.get('/ai/pending-cost-classifications'),
  classifyCostType: (transactionIds: string[]) =>
    api.post('/ai/classify-cost-type', { transactionIds }),
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
};

// ============================================
// ALERTS (existente)
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
// CATEGORIES
// ============================================
export const categoriesApi = {
  list: () => api.get('/categories'),
};

// ============================================
// HEALTH
// ============================================
export const healthApi = {
  check: () => api.get('/health'),
};
// ============================================
// OCR (Importação de Documentos com IA)
// ============================================
export const ocrApi = {
  extract: (file: File, tipoTransacao: 'INCOME' | 'EXPENSE') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo_transacao', tipoTransacao);
    return api.post('/ocr/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },
  confirm: (data: {
    description: string;
    amount: number;
    date: string;
    tipo_transacao: 'INCOME' | 'EXPENSE';
    categoryId?: string;
    counterpartyId?: string;
    counterpartyName?: string;
    documentNumber?: string;
    documentType?: 'INVOICE' | 'RECEIPT' | 'BANK_STATEMENT' | 'CONTRACT' | 'OTHER';
    dueDate?: string;
    notes?: string;
    extractionId?: string;
  }) => api.post('/ocr/confirm', data),
  history: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    return api.get(`/ocr/history?${query.toString()}`);
  },
};
export default api;
