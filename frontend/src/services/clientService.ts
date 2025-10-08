import { apiService } from './api';
import { Client, PaginatedResponse, ApiResponse } from '../types';

export interface ClientFilters {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  page?: number;
  limit?: number;
}

export interface CreateClientData {
  name: string;
  email: string;
  country?: string;
  company?: string;
  address?: string;
}

export interface UpdateClientData extends Partial<CreateClientData> {
  status?: 'ACTIVE' | 'INACTIVE';
}

class ClientService {
  async getClients(filters: ClientFilters = {}): Promise<PaginatedResponse<Client>> {
    const response = await apiService.get<any>('/clients', filters);
    // Map backend isActive -> frontend status
    const mapped: Client[] = (response.data || []).map((c: any) => ({
      ...c,
      status: c.isActive ? 'ACTIVE' : 'INACTIVE',
    }));
    return {
      data: mapped,
      pagination: response.pagination || { page: 0, limit: 25, total: 0, pages: 0 }
    };
  }

  async getClient(id: string): Promise<Client> {
    const response = await apiService.get<ApiResponse<any>>(`/clients/${id}`);
    const c = response.data as any;
    return { ...c, status: c.isActive ? 'ACTIVE' : 'INACTIVE' } as Client;
  }

  async createClient(data: CreateClientData): Promise<Client> {
    const response = await apiService.post<ApiResponse<any>>('/clients', data);
    const c = response.data as any;
    return { ...c, status: c.isActive ? 'ACTIVE' : 'INACTIVE' } as Client;
  }

  async updateClient(id: string, data: UpdateClientData): Promise<Client> {
    const response = await apiService.put<ApiResponse<any>>(`/clients/${id}`, data);
    const c = response.data as any;
    return { ...c, status: c.isActive ? 'ACTIVE' : 'INACTIVE' } as Client;
  }

  async deleteClient(id: string): Promise<void> {
    await apiService.delete(`/clients/${id}`);
  }
}

export const clientService = new ClientService();
