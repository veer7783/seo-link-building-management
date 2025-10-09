import { apiService } from './api';
import { autoRoundPrice } from '../utils/priceRounding';

export interface GuestBlogPlacement {
  id: string;
  placementId: string;
  originalOrderId: string;
  originalOrderNumber: string;
  clientId: string;
  projectId: string;
  guestBlogSiteId: string;
  price: number;
  contentText?: string;
  contentDocUrl?: string;
  status: 'READY_TO_PUBLISH' | 'FOR_REVIEW' | 'COMPLETED' | 'FAILED' | 'APPROVED' | 'PLACED' | 'LIVE' | 'PENDING';
  placedAt?: string;
  liveUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
  project: {
    id: string;
    projectName: string;
    websiteUrl?: string;
    companyName?: string;
  };
  guestBlogSite: {
    id: string;
    site_url: string;
    da: number;
    dr: number;
    publisher: {
      id: string;
      publisherName: string;
      email?: string;
    };
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreatePlacementsRequest {
  orderIds: string[];
}

export interface UpdatePlacementRequest {
  status?: 'APPROVED' | 'PLACED' | 'FAILED';
  liveUrl?: string;
  notes?: string;
}

export interface GetPlacementsParams {
  page?: number;
  limit?: number;
  clientId?: string;
  projectId?: string;
  search?: string;
  status?: string;
}

export interface PlacementsResponse {
  success: boolean;
  data: GuestBlogPlacement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class GuestBlogPlacementService {
  async getPlacements(params: GetPlacementsParams = {}): Promise<PlacementsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.projectId) queryParams.append('projectId', params.projectId);
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);

    const url = queryParams.toString() ? `/guest-blog-placements?${queryParams.toString()}` : '/guest-blog-placements';
    return await apiService.get<PlacementsResponse>(url);
  }

  async createPlacements(data: CreatePlacementsRequest): Promise<{ success: boolean; data: GuestBlogPlacement[]; message: string }> {
    return await apiService.post<{ success: boolean; data: GuestBlogPlacement[]; message: string }>('/guest-blog-placements', data);
  }

  async updatePlacement(id: string, data: UpdatePlacementRequest): Promise<{ success: boolean; data: GuestBlogPlacement; message: string }> {
    return await apiService.put<{ success: boolean; data: GuestBlogPlacement; message: string }>(`/guest-blog-placements/${id}`, data);
  }

  async deletePlacement(id: string): Promise<{ success: boolean; message: string }> {
    return await apiService.delete<{ success: boolean; message: string }>(`/guest-blog-placements/${id}`);
  }

  // Utility functions
  formatPrice(price: number): string {
    const roundedPrice = autoRoundPrice(price);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(roundedPrice);
  }

  // Legacy status mapping for backward compatibility
  mapLegacyStatus(status: string): string {
    switch (status) {
      case 'PENDING': return 'READY_TO_PUBLISH';
      case 'APPROVED': return 'READY_TO_PUBLISH';
      case 'PLACED': return 'FOR_REVIEW';
      case 'LIVE': return 'COMPLETED';
      default: return status;
    }
  }

  getStatusLabel(status: string): string {
    // Map legacy status first
    const mappedStatus = this.mapLegacyStatus(status);
    
    switch (mappedStatus) {
      case 'READY_TO_PUBLISH': return 'Ready to Publish';
      case 'FOR_REVIEW': return 'For Review';
      case 'COMPLETED': return 'Completed';
      case 'FAILED': return 'Failed';
      default: return mappedStatus;
    }
  }

  getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    // Map legacy status first
    const mappedStatus = this.mapLegacyStatus(status);
    
    switch (mappedStatus) {
      case 'READY_TO_PUBLISH': return 'info';
      case 'FOR_REVIEW': return 'warning';
      case 'COMPLETED': return 'success';
      case 'FAILED': return 'error';
      default: return 'default';
    }
  }

  // Get status color for custom styling (hex colors)
  getStatusHexColor(status: string): string {
    const mappedStatus = this.mapLegacyStatus(status);
    
    switch (mappedStatus) {
      case 'READY_TO_PUBLISH': return '#3B82F6'; // Blue
      case 'FOR_REVIEW': return '#F59E0B'; // Orange
      case 'COMPLETED': return '#10B981'; // Green
      case 'FAILED': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  }

  // Get all available statuses for filtering
  getAvailableStatuses(): Array<{value: string, label: string, color: string}> {
    return [
      { value: 'READY_TO_PUBLISH', label: 'Ready to Publish', color: '#3B82F6' },
      { value: 'FOR_REVIEW', label: 'For Review', color: '#F59E0B' },
      { value: 'COMPLETED', label: 'Completed', color: '#10B981' },
      { value: 'FAILED', label: 'Failed', color: '#EF4444' }
    ];
  }

  // Utility function to get full file URL
  getFileUrl(relativePath: string): string {
    if (!relativePath) return '';
    // If it's already a full URL, return as-is
    if (relativePath.startsWith('http')) return relativePath;
    // Otherwise, prepend the backend base URL
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    return `${backendUrl}${relativePath}`;
  }

  // Utility function to get filename from URL
  getFileName(fileUrl: string): string {
    if (!fileUrl) return 'document';
    const parts = fileUrl.split('/');
    return parts[parts.length - 1] || 'document';
  }

  // Function to download file
  async downloadFile(fileUrl: string, fileName?: string): Promise<void> {
    if (!fileUrl) return;
    
    const downloadName = fileName || this.getFileName(fileUrl);
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    try {
      // Try using the dedicated download endpoint first
      const filename = this.getFileName(fileUrl);
      const downloadUrl = `${backendUrl}/api/guest-blog-orders/download/${filename}`;
      
      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback: try direct file URL
      const fullUrl = this.getFileUrl(fileUrl);
      window.open(fullUrl, '_blank');
    }
  }
}

export const guestBlogPlacementService = new GuestBlogPlacementService();
