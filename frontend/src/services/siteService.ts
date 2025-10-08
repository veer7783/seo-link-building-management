import { apiService } from './api';
import { PaginatedResponse, ApiResponse } from '../types';
import { Site, SitePricing, CreateSiteData, UpdateSiteData, SiteFilters } from '../types/site';

export interface SetPriceOverrideData {
  overridePrice: number;
}

class SiteService {
  async getSites(filters: SiteFilters = {}): Promise<PaginatedResponse<Site>> {
    const response = await apiService.get<ApiResponse<PaginatedResponse<Site>>>('/sites', filters);
    return response.data;
  }

  async getSite(id: string): Promise<Site> {
    const response = await apiService.get<ApiResponse<Site>>(`/sites/${id}`);
    return response.data;
  }

  async createSite(data: CreateSiteData): Promise<Site> {
    const response = await apiService.post<ApiResponse<Site>>('/sites', data);
    return response.data;
  }

  async updateSite(id: string, data: UpdateSiteData): Promise<Site> {
    const response = await apiService.put<ApiResponse<Site>>(`/sites/${id}`, data);
    return response.data;
  }

  async deleteSite(id: string): Promise<void> {
    await apiService.delete(`/sites/${id}`);
  }

  // Pricing-related methods
  async getSitePricingForClient(clientId: string): Promise<SitePricing[]> {
    const response = await apiService.get<ApiResponse<SitePricing[]>>(`/sites/pricing/${clientId}`);
    return response.data;
  }

  async getSitePricingForClientSite(clientId: string, siteId: string): Promise<SitePricing> {
    const response = await apiService.get<ApiResponse<SitePricing>>(`/sites/pricing/${clientId}/${siteId}`);
    return response.data;
  }

  async setSitePriceOverride(clientId: string, siteId: string, data: SetPriceOverrideData): Promise<void> {
    await apiService.post(`/sites/pricing/${clientId}/${siteId}/override`, data);
  }

  async removeSitePriceOverride(clientId: string, siteId: string): Promise<void> {
    await apiService.delete(`/sites/pricing/${clientId}/${siteId}/override`);
  }

  async bulkImport(file: File): Promise<{ imported: number; errors: any[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiService.upload<ApiResponse<any>>('/sites/bulk-import', formData);
    return response.data;
  }
}

export const siteService = new SiteService();
export type { Site, CreateSiteData, UpdateSiteData, SiteFilters, SitePricing };
