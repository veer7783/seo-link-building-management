import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface CreateClientData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  billingEmail?: string;
  currency?: string;
}

export interface CreatePublisherData {
  name: string;
  email: string;
  phone?: string;
  website?: string;
  paymentInfo?: {
    method: string;
    email?: string;
    accountNumber?: string;
    routingNumber?: string;
  };
}

export interface CreateSiteData {
  domain: string;
  domainRating: number;
  monthlyTraffic: number;
  category: string;
  language: string;
  country: string;
  turnaroundTime: number;
  clientPrice: number;
  internalCost: number;
  publisherId: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  clientId: string;
  minDomainRating: number;
  minMonthlyTraffic: number;
  budgetCap: number;
  anchorDistribution: {
    exactMatch: number;
    partialMatch: number;
    branded: number;
    generic: number;
  };
  blacklistedDomains?: string[];
  whitelistedDomains?: string[];
}

export interface CreateOrderData {
  projectId: string;
  targetUrl: string;
  anchorText: string;
  anchorType: string;
  deadline?: string;
  notes?: string;
  siteIds: string[];
}

export class DataEntryService {
  // Client operations
  static async createClient(data: CreateClientData) {
    const response = await api.post('/clients', data);
    return response.data;
  }

  static async getClients(page = 1, limit = 50) {
    const response = await api.get(`/clients?page=${page}&limit=${limit}`);
    return response.data;
  }

  static async updateClient(id: string, data: Partial<CreateClientData>) {
    const response = await api.put(`/clients/${id}`, data);
    return response.data;
  }

  static async deleteClient(id: string) {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  }

  // Publisher operations
  static async createPublisher(data: CreatePublisherData) {
    const response = await api.post('/publishers', data);
    return response.data;
  }

  static async getPublishers(page = 1, limit = 50) {
    const response = await api.get(`/publishers?page=${page}&limit=${limit}`);
    return response.data;
  }

  static async updatePublisher(id: string, data: Partial<CreatePublisherData>) {
    const response = await api.put(`/publishers/${id}`, data);
    return response.data;
  }

  static async deletePublisher(id: string) {
    const response = await api.delete(`/publishers/${id}`);
    return response.data;
  }

  // Site operations
  static async createSite(data: CreateSiteData) {
    const response = await api.post('/sites', data);
    return response.data;
  }

  static async getSites(page = 1, limit = 50, filters?: any) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    const response = await api.get(`/sites?${params}`);
    return response.data;
  }

  static async updateSite(id: string, data: Partial<CreateSiteData>) {
    const response = await api.put(`/sites/${id}`, data);
    return response.data;
  }

  static async deleteSite(id: string) {
    const response = await api.delete(`/sites/${id}`);
    return response.data;
  }

  // Project operations
  static async createProject(data: CreateProjectData) {
    const response = await api.post('/projects', data);
    return response.data;
  }

  static async getProjects(page = 1, limit = 50) {
    const response = await api.get(`/projects?page=${page}&limit=${limit}`);
    return response.data;
  }

  static async updateProject(id: string, data: Partial<CreateProjectData>) {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  }

  static async deleteProject(id: string) {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  }

  // Order operations
  static async createOrder(data: CreateOrderData) {
    const response = await api.post('/orders', data);
    return response.data;
  }

  static async getOrders(page = 1, limit = 50, filters?: any) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    const response = await api.get(`/orders?${params}`);
    return response.data;
  }

  static async updateOrder(id: string, data: Partial<CreateOrderData>) {
    const response = await api.put(`/orders/${id}`, data);
    return response.data;
  }

  static async deleteOrder(id: string) {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  }

  // Content operations
  static async createContent(orderId: string, data: any) {
    const response = await api.post(`/orders/${orderId}/content`, data);
    return response.data;
  }

  static async updateContent(orderId: string, data: any) {
    const response = await api.put(`/orders/${orderId}/content`, data);
    return response.data;
  }

  // Dashboard stats
  static async getDashboardStats() {
    const response = await api.get('/dashboard/stats');
    return response.data;
  }

  // Bulk operations
  static async bulkCreateSites(sites: CreateSiteData[]) {
    const response = await api.post('/sites/bulk', { sites });
    return response.data;
  }

  static async importSitesFromCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/sites/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Validation helpers
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static validateDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }

  // Search and filtering
  static async searchSites(query: string, filters?: any) {
    const params = new URLSearchParams({
      search: query,
      ...filters,
    });
    const response = await api.get(`/sites/search?${params}`);
    return response.data;
  }

  static async getAvailableSites(projectId: string) {
    const response = await api.get(`/projects/${projectId}/available-sites`);
    return response.data;
  }

  // Analytics and reporting
  static async getProjectAnalytics(projectId: string, dateRange?: { start: string; end: string }) {
    const params = dateRange ? new URLSearchParams(dateRange) : '';
    const response = await api.get(`/projects/${projectId}/analytics?${params}`);
    return response.data;
  }

  static async getPublisherPerformance(publisherId: string) {
    const response = await api.get(`/publishers/${publisherId}/performance`);
    return response.data;
  }
}

export default DataEntryService;
