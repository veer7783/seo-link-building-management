import { apiService } from './api';
import { Order, PaginatedResponse, ApiResponse } from '../types';

export interface OrderFilters {
  search?: string;
  projectId?: string;
  status?: 'BRIEF_PENDING' | 'CONTENT_CREATION' | 'CONTENT_REVIEW' | 'PUBLISHED' | 'COMPLETED';
  type?: 'GUEST_POST' | 'LINK_INSERTION';
  page?: number;
  limit?: number;
}

export interface CreateOrderData {
  projectId: string;
  type: 'GUEST_POST' | 'LINK_INSERTION';
  targetUrl: string;
  anchorText: string;
  anchorType: 'EXACT' | 'PARTIAL' | 'BRANDED' | 'GENERIC';
  requirements?: string;
  siteIds: string[];
}

export interface UpdateOrderData extends Partial<CreateOrderData> {
  status?: 'BRIEF_PENDING' | 'CONTENT_CREATION' | 'CONTENT_REVIEW' | 'PUBLISHED' | 'COMPLETED';
}

class OrderService {
  async getOrders(filters: OrderFilters = {}): Promise<PaginatedResponse<Order>> {
    const response = await apiService.get<ApiResponse<PaginatedResponse<Order>>>('/orders', filters);
    return response.data;
  }

  async getOrder(id: string): Promise<Order> {
    const response = await apiService.get<ApiResponse<Order>>(`/orders/${id}`);
    return response.data;
  }

  async createOrder(data: CreateOrderData): Promise<Order> {
    const response = await apiService.post<ApiResponse<Order>>('/orders', data);
    return response.data;
  }

  async updateOrder(id: string, data: UpdateOrderData): Promise<Order> {
    const response = await apiService.put<ApiResponse<Order>>(`/orders/${id}`, data);
    return response.data;
  }

  async deleteOrder(id: string): Promise<void> {
    await apiService.delete(`/orders/${id}`);
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    const response = await apiService.put<ApiResponse<Order>>(`/orders/${id}/status`, { status });
    return response.data;
  }
}

export const orderService = new OrderService();
