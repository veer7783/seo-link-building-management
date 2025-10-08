import { apiService } from './api';
import {
  GuestBlogSite,
  CreateGuestBlogSiteRequest,
  UpdateGuestBlogSiteRequest,
  GuestBlogSiteFilters,
  GuestBlogSitePricing,
  SetPriceOverrideRequest,
} from '../types/guestBlogSite';

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class GuestBlogSiteService {
  private baseUrl = '/guest-sites';

  async getGuestBlogSites(filters: GuestBlogSiteFilters = {}): Promise<PaginatedResponse<GuestBlogSite>> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.country) params.append('country', filters.country);
    if (filters.status) params.append('status', filters.status);
    if (filters.publisherId) params.append('publisherId', filters.publisherId);
    if (filters.clientId) params.append('clientId', filters.clientId);

    const response = await apiService.get<PaginatedResponse<GuestBlogSite>>(`/guest-sites?${params.toString()}`);
    return response;
  }

  async getGuestBlogSite(id: string, clientId?: string): Promise<ApiResponse<GuestBlogSite>> {
    const params = clientId ? `?clientId=${clientId}` : '';
    const response = await apiService.get<ApiResponse<GuestBlogSite>>(`/guest-sites/${id}${params}`);
    return response;
  }

  async createGuestBlogSite(data: CreateGuestBlogSiteRequest): Promise<ApiResponse<GuestBlogSite>> {
    console.log('Creating guest blog site with baseUrl:', this.baseUrl);
    const response = await apiService.post<ApiResponse<GuestBlogSite>>('/guest-sites', data);
    return response;
  }

  async updateGuestBlogSite(id: string, data: UpdateGuestBlogSiteRequest): Promise<ApiResponse<GuestBlogSite>> {
    const response = await apiService.put<ApiResponse<GuestBlogSite>>(`/guest-sites/${id}`, data);
    return response;
  }

  async deleteGuestBlogSite(id: string): Promise<ApiResponse<void>> {
    const response = await apiService.delete<ApiResponse<void>>(`/guest-sites/${id}`);
    return response;
  }

  async setPriceOverride(
    clientId: string,
    siteId: string,
    data: SetPriceOverrideRequest
  ): Promise<ApiResponse<void>> {
    const response = await apiService.post<ApiResponse<void>>(
      `/guest-sites/pricing/${clientId}/${siteId}/override`,
      data
    );
    return response;
  }

  async removePriceOverride(clientId: string, siteId: string): Promise<ApiResponse<void>> {
    const response = await apiService.delete<ApiResponse<void>>(
      `/guest-sites/pricing/${clientId}/${siteId}/override`
    );
    return response;
  }

  // Helper method to calculate displayed price
  calculateDisplayedPrice(basePrice: number, clientPercentage?: number): number {
    const percentage = clientPercentage || 25; // Default 25% markup
    return basePrice + (basePrice * percentage / 100);
  }

  // Helper method to format price
  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  // Helper method to format traffic
  formatTraffic(traffic: number): string {
    if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`;
    if (traffic >= 1000) return `${(traffic / 1000).toFixed(1)}K`;
    return traffic.toString();
  }
}

export const guestBlogSiteService = new GuestBlogSiteService();
