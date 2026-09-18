/**
 * Centralized API Client for Varun Trade Stock Maintenance
 */

const getApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) {
    const sanitized = envUrl.replace(/\/+$/, '');
    return sanitized.endsWith('/api') ? sanitized : `${sanitized}/api`;
  }
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

export interface ApiResponse<T> {
  success: boolean;
  count?: number;
  total?: number;
  page?: number;
  totalPages?: number;
  data: T;
  message?: string;
  error?: string;
  status?: string;
}

// Generic Request Helper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalized}`;

  const token = typeof window !== 'undefined' ? localStorage.getItem('varun_stock_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const text = await response.text();
    let json: any = {};
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { message: text };
      }
    }

    if (!response.ok) {
      const errMessage = json.message || json.error || `HTTP Error ${response.status}`;
      const err: any = new Error(errMessage);
      err.status = json.status || response.status;
      err.data = json;
      throw err;
    }

    return json;
  } catch (error) {
    console.error(`[API Error] Request to ${endpoint} failed:`, error);
    throw error;
  }
}

// Auth API
export const AuthApi = {
  login: (credentials: { username: string; password: string }) =>
    request<{ success: boolean; token: string; user: { id: string; username: string; name: string; role: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(credentials) }
    ),
  getMe: () => request<{ success: boolean; user: any }>('/auth/me'),
  updateProfile: (data: { name?: string; currentPassword?: string; newPassword?: string }) =>
    request<{ success: boolean; message: string; user: any }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getUsers: () => request<{ success: boolean; data: any[] }>('/auth/users'),
  createUser: (data: any) => request<any>('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
};

// Inventory & Stock API
export const InventoryApi = {
  getDashboardStats: () => request<{ success: boolean; data: any }>('/inventory/dashboard'),
  getList: (params?: { category?: string; search?: string; filterLowStock?: string; sortBy?: string; sortOrder?: string }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'ALL') query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.filterLowStock) query.append('filterLowStock', params.filterLowStock);
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
    const qs = query.toString();
    return request<{ success: boolean; count: number; data: any[] }>(`/inventory${qs ? `?${qs}` : ''}`);
  },
  getProductStockDetail: (id: string) =>
    request<{ success: boolean; data: { product: any; inventory: any; transactions: any[] } }>(
      `/inventory/product/${id}`
    ),
  updateOpeningStock: (data: { productId: string; godownQty: number; shopQty: number }) =>
    request<any>('/inventory/opening-stock', { method: 'POST', body: JSON.stringify(data) }),
};

// Products API
export const ProductsApi = {
  getAll: (params?: { category?: string; search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'ALL') query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    return request<{ success: boolean; count: number; data: any[] }>(`/products${qs ? `?${qs}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: any }>(`/products/${id}`),
  syncFromBilling: () =>
    request<{ success: boolean; message: string; syncedCount: number; updatedCount: number; totalParticulars: number }>(
      '/products/sync-billing',
      { method: 'POST' }
    ),
  create: (data: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  bulkUpload: (products: any[]) =>
    request<{ success: boolean; message: string; insertedCount: number; updatedCount: number; errors?: string[] }>(
      '/products/bulk',
      { method: 'POST', body: JSON.stringify({ products }) }
    ),
  update: (id: string, data: any) => request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/products/${id}`, { method: 'DELETE' }),
};

// Categories API
export const CategoriesApi = {
  getAll: () => request<{ success: boolean; count: number; data: any[] }>('/categories'),
  create: (data: { name: string; description?: string }) =>
    request<any>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string }) =>
    request<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/categories/${id}`, { method: 'DELETE' }),
};

// Stock Transfers API (Godown -> Shop)
export const TransfersApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return request<{ success: boolean; total: number; page: number; totalPages: number; data: any[] }>(
      `/transfers${qs ? `?${qs}` : ''}`
    );
  },
  getById: (id: string) => request<{ success: boolean; data: any }>(`/transfers/${id}`),
  create: (data: {
    items: Array<{ productId: string; transferQuantity: number }>;
    direction?: 'GODOWN_TO_SHOP' | 'SHOP_TO_GODOWN';
    remarks?: string;
  }) => request<any>('/transfers', { method: 'POST', body: JSON.stringify(data) }),
};

// Stock Adjustments API
export const AdjustmentsApi = {
  getAll: (params?: { location?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.location && params.location !== 'ALL') query.append('location', params.location);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return request<{ success: boolean; total: number; page: number; totalPages: number; data: any[] }>(
      `/adjustments${qs ? `?${qs}` : ''}`
    );
  },
  create: (data: { productId: string; location: 'GODOWN' | 'SHOP'; physicalQty: number; reason: string }) =>
    request<any>('/adjustments', { method: 'POST', body: JSON.stringify(data) }),
};

// Stock Transactions Ledger API
export const TransactionsApi = {
  getAll: (params?: {
    type?: string;
    location?: string;
    sku?: string;
    search?: string;
    referenceId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.type && params.type !== 'ALL') query.append('type', params.type);
    if (params?.location && params.location !== 'ALL') query.append('location', params.location);
    if (params?.sku) query.append('sku', params.sku);
    if (params?.search) query.append('search', params.search);
    if (params?.referenceId) query.append('referenceId', params.referenceId);
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params?.dateTo) query.append('dateTo', params.dateTo);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return request<{ success: boolean; total: number; page: number; totalPages: number; data: any[] }>(
      `/transactions${qs ? `?${qs}` : ''}`
    );
  },
};

// Reports API
export const ReportsApi = {
  getSummary: (category?: string) => {
    const qs = category && category !== 'ALL' ? `?category=${encodeURIComponent(category)}` : '';
    return request<{ success: boolean; count: number; data: any[] }>(`/reports/summary${qs}`);
  },
  getMovements: (params?: { dateFrom?: string; dateTo?: string; type?: string; location?: string; sku?: string }) => {
    const query = new URLSearchParams();
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params?.dateTo) query.append('dateTo', params.dateTo);
    if (params?.type && params.type !== 'ALL') query.append('type', params.type);
    if (params?.location && params.location !== 'ALL') query.append('location', params.location);
    if (params?.sku) query.append('sku', params.sku);
    const qs = query.toString();
    return request<{ success: boolean; count: number; data: any[] }>(`/reports/movements${qs ? `?${qs}` : ''}`);
  },
  getTransfers: (params?: { dateFrom?: string; dateTo?: string }) => {
    const query = new URLSearchParams();
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params?.dateTo) query.append('dateTo', params.dateTo);
    const qs = query.toString();
    return request<{ success: boolean; count: number; data: any[] }>(`/reports/transfers${qs ? `?${qs}` : ''}`);
  },
  getSales: (params?: { dateFrom?: string; dateTo?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params?.dateTo) query.append('dateTo', params.dateTo);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return request<{ success: boolean; count: number; data: any[] }>(`/reports/sales${qs ? `?${qs}` : ''}`);
  },
  getLowStock: () => request<{ success: boolean; count: number; data: any[] }>('/reports/low-stock'),
};

// Integration API (Health, Events, Simulator)
export const IntegrationApi = {
  getHealth: () => request<any>('/integration/billing/health'),
  getEvents: (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return request<{ success: boolean; total: number; page: number; totalPages: number; data: any[] }>(
      `/integration/billing/events${qs ? `?${qs}` : ''}`
    );
  },
  retryEvent: (id: string) => request<any>(`/integration/billing/retry/${id}`, { method: 'POST' }),
  // Simulator endpoints for testing integration from UI
  simulateSale: (payload: any, idempotencyKey?: string, apiKey?: string) =>
    request<any>('/integration/billing/sale', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    }),
  simulateReversal: (payload: any, apiKey?: string) =>
    request<any>('/integration/billing/reversal', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    }),
};

// Settings API
export const SettingsApi = {
  get: () => request<{ success: boolean; data: any }>('/settings'),
  update: (data: any) => request<any>('/settings', { method: 'POST', body: JSON.stringify(data) }),
};

// Audit Logs API
export const AuditLogsApi = {
  getAll: (params?: { module?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.module && params.module !== 'ALL') query.append('module', params.module);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return request<{ success: boolean; total: number; page: number; totalPages: number; data: any[] }>(
      `/audit-logs${qs ? `?${qs}` : ''}`
    );
  },
};
