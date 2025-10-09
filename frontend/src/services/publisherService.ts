import { apiService } from './api';

export interface Publisher {
  id: string;
  publisherName: string;
  email?: string;
  whatsapp?: string;
  modeOfCommunication: 'EMAIL' | 'WHATSAPP';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

export interface CreatePublisherRequest {
  publisherName: string;
  email?: string;
  whatsapp?: string;
  modeOfCommunication: 'EMAIL' | 'WHATSAPP';
}

export interface UpdatePublisherRequest extends Partial<CreatePublisherRequest> {
  isActive?: boolean;
}

export interface PublisherFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface PaginatedPublishersResponse {
  data: Publisher[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class PublisherService {
  async getPublishers(filters: PublisherFilters = {}): Promise<PaginatedPublishersResponse> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    
    const response = await apiService.get<PaginatedPublishersResponse>(`/publishers?${params.toString()}`);
    return response;
  }

  async getPublisher(id: string): Promise<Publisher> {
    const response = await apiService.get<ApiResponse<Publisher>>(`/publishers/${id}`);
    return response.data;
  }

  async createPublisher(data: CreatePublisherRequest): Promise<Publisher> {
    const response = await apiService.post<ApiResponse<Publisher>>('/publishers', data);
    return response.data;
  }

  async updatePublisher(id: string, data: UpdatePublisherRequest): Promise<Publisher> {
    const response = await apiService.put<ApiResponse<Publisher>>(`/publishers/${id}`, data);
    return response.data;
  }

  async deletePublisher(id: string): Promise<void> {
    await apiService.delete<ApiResponse<void>>(`/publishers/${id}`);
  }

  async togglePublisherStatus(id: string): Promise<Publisher> {
    const response = await apiService.patch<ApiResponse<Publisher>>(`/publishers/${id}/toggle-status`);
    return response.data;
  }

  async getPublisherByEmail(email: string): Promise<Publisher> {
    const encodedEmail = encodeURIComponent(email);
    const response = await apiService.get<ApiResponse<Publisher>>(`/publishers/by-email/${encodedEmail}`);
    return response.data;
  }
}

export const publisherService = new PublisherService();
