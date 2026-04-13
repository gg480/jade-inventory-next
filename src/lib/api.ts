// API client for jade inventory system
const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (json.code !== 0 && json.code !== 200) {
    throw new Error(json.message || '请求失败');
  }
  return json.data as T;
}

// ========== Dicts ==========
export const dictsApi = {
  getMaterials: (includeInactive = false) =>
    request<any[]>(`/dicts/materials?include_inactive=${includeInactive}`),
  createMaterial: (data: any) =>
    request<any>('/dicts/materials', { method: 'POST', body: JSON.stringify(data) }),
  updateMaterial: (id: number, data: any) =>
    request<any>(`/dicts/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMaterial: (id: number) =>
    request<any>(`/dicts/materials/${id}`, { method: 'DELETE' }),

  getTypes: (includeInactive = false) =>
    request<any[]>(`/dicts/types?include_inactive=${includeInactive}`),
  createType: (data: any) =>
    request<any>('/dicts/types', { method: 'POST', body: JSON.stringify(data) }),
  updateType: (id: number, data: any) =>
    request<any>(`/dicts/types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteType: (id: number) =>
    request<any>(`/dicts/types/${id}`, { method: 'DELETE' }),

  getTags: (groupName?: string, includeInactive = false) =>
    request<any[]>(`/dicts/tags?${groupName ? `group_name=${groupName}&` : ''}include_inactive=${includeInactive}`),
  createTag: (data: any) =>
    request<any>('/dicts/tags', { method: 'POST', body: JSON.stringify(data) }),
  updateTag: (id: number, data: any) =>
    request<any>(`/dicts/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTag: (id: number) =>
    request<any>(`/dicts/tags/${id}`, { method: 'DELETE' }),
};

// ========== Config ==========
export const configApi = {
  getConfig: () => request<any[]>('/config'),
  updateConfig: (key: string, value: string) =>
    request<any>(`/config`, { method: 'PUT', body: JSON.stringify({ key, value }) }),
};

// ========== Batches ==========
export const batchesApi = {
  getBatches: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any>(`/batches${qs}`);
  },
  getBatch: (id: number) => request<any>(`/batches/${id}`),
  createBatch: (data: any) =>
    request<any>('/batches', { method: 'POST', body: JSON.stringify(data) }),
  updateBatch: (id: number, data: any) =>
    request<any>(`/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  allocateBatch: (id: number) =>
    request<any>(`/batches/${id}/allocate`, { method: 'POST' }),
};

// ========== Items ==========
export const itemsApi = {
  getItems: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any>(`/items${qs}`);
  },
  getItem: (id: number) => request<any>(`/items/${id}`),
  createItem: (data: any) =>
    request<any>('/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id: number, data: any) =>
    request<any>(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id: number) =>
    request<any>(`/items/${id}`, { method: 'DELETE' }),
  createItemsBatch: (data: any) =>
    request<any>('/items/batch', { method: 'POST', body: JSON.stringify(data) }),
};

// ========== Sales ==========
export const salesApi = {
  getSales: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any>(`/sales${qs}`);
  },
  createSale: (data: any) =>
    request<any>('/sales', { method: 'POST', body: JSON.stringify(data) }),
  createBundleSale: (data: any) =>
    request<any>('/sales/bundle', { method: 'POST', body: JSON.stringify(data) }),
};

// ========== Customers ==========
export const customersApi = {
  getCustomers: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any>(`/customers${qs}`);
  },
  getCustomerDetail: (id: number) => request<any>(`/customers/${id}`),
  createCustomer: (data: any) =>
    request<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: number, data: any) =>
    request<any>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ========== Suppliers ==========
export const suppliersApi = {
  getSuppliers: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any>(`/suppliers${qs}`);
  },
  createSupplier: (data: any) =>
    request<any>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: number, data: any) =>
    request<any>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: number) =>
    request<any>(`/suppliers/${id}`, { method: 'DELETE' }),
};

// ========== Dashboard ==========
export const dashboardApi = {
  getSummary: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any>(`/dashboard/summary${qs}`);
  },
  getBatchProfit: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any[]>(`/dashboard/batch-profit${qs}`);
  },
  getProfitByCategory: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any[]>(`/dashboard/profit/by-category${qs}`);
  },
  getProfitByChannel: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any[]>(`/dashboard/profit/by-channel${qs}`);
  },
  getTrend: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any[]>(`/dashboard/trend${qs}`);
  },
  getStockAging: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any>(`/dashboard/stock-aging${qs}`);
  },
  getDistributionByType: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any>(`/dashboard/distribution/by-type${qs}`);
  },
  getDistributionByMaterial: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any>(`/dashboard/distribution/by-material${qs}`);
  },
  getProfitByCounter: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any[]>(`/dashboard/profit/by-counter${qs}`);
  },
  getPriceRangeCost: () => request<any[]>(`/dashboard/price-range/cost`),
  getPriceRangeSelling: () => request<any[]>(`/dashboard/price-range/selling`),
  getWeightDistribution: () => request<any>(`/dashboard/weight-distribution`),
  getAgeDistribution: () => request<any[]>(`/dashboard/age-distribution`),
};

// ========== Metal Prices ==========
export const metalApi = {
  getCurrentPrices: () => request<any[]>('/metal-prices'),
  updatePrice: (data: any) =>
    request<any>('/metal-prices', { method: 'POST', body: JSON.stringify(data) }),
  getPriceHistory: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return request<any[]>(`/metal-prices/history${qs}`);
  },
  previewReprice: (data: any) =>
    request<any>('/metal-prices/reprice', { method: 'POST', body: JSON.stringify(data) }),
  confirmReprice: (data: any) =>
    request<any>('/metal-prices/reprice/confirm', { method: 'POST', body: JSON.stringify(data) }),
};

// ========== Export ==========
export const exportApi = {
  inventory: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return `${BASE}/export/inventory${qs}`;
  },
  sales: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return `${BASE}/export/sales${qs}`;
  },
  batches: (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
    return `${BASE}/export/batches${qs}`;
  },
};
