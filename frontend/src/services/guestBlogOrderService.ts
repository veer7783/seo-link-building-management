import { apiService } from './api';
import { autoRoundPrice } from '../utils/priceRounding';

export interface GuestBlogOrder {
  id: string;
  orderId: string;
  clientId: string;
  projectId: string;
  guestBlogSiteId: string;
  price: number;
  contentText?: string;
  contentDocUrl?: string;
  status: 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    email: string;
    percentage?: number;
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
    category: string;
    base_price: number;
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

export interface CartItem {
  guestBlogSiteId: string;
  clientId: string;
  projectId: string;
  price: number;
  contentText?: string;
  contentDocUrl?: string;
}

export interface CreateOrdersRequest {
  cartItems: CartItem[];
}

export interface UpdateOrderRequest {
  contentText?: string;
  status?: 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  contentDocUrl?: string;
}

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  clientId?: string;
  projectId?: string;
  search?: string;
}

export interface OrdersResponse {
  success: boolean;
  data: GuestBlogOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface FileUploadResponse {
  success: boolean;
  data: {
    url: string;
    filename: string;
    originalName: string;
    size: number;
  };
}

class GuestBlogOrderService {
  private baseUrl = '/guest-blog-orders';

  async getOrders(params: GetOrdersParams = {}): Promise<OrdersResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.status) searchParams.append('status', params.status);
    if (params.clientId) searchParams.append('clientId', params.clientId);
    if (params.projectId) searchParams.append('projectId', params.projectId);
    if (params.search) searchParams.append('search', params.search);

    const queryString = searchParams.toString();
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
    
    return await apiService.get<OrdersResponse>(url);
  }

  async createOrders(data: CreateOrdersRequest): Promise<{ success: boolean; data: GuestBlogOrder[]; message: string }> {
    console.log('GuestBlogOrderService - Creating orders with data:', JSON.stringify(data, null, 2));
    try {
      const response = await apiService.post<{ success: boolean; data: GuestBlogOrder[]; message: string }>(this.baseUrl, data);
      console.log('GuestBlogOrderService - Success response:', response);
      return response;
    } catch (error: any) {
      console.error('GuestBlogOrderService - Error response:', error.response?.data);
      console.error('GuestBlogOrderService - Validation errors:', error.response?.data?.errors);
      throw error;
    }
  }

  async updateOrder(id: string, data: UpdateOrderRequest): Promise<{ success: boolean; data: GuestBlogOrder; message: string }> {
    return await apiService.put<{ success: boolean; data: GuestBlogOrder; message: string }>(`${this.baseUrl}/${id}`, data);
  }

  async uploadContentDocument(file: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('contentDoc', file);
    return await apiService.upload<FileUploadResponse>(`${this.baseUrl}/upload-content-doc`, formData);
  }

  async deleteOrder(id: string): Promise<{ success: boolean; message: string }> {
    return await apiService.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }

  async placeBulkOrders(orderIds: string[]): Promise<{ success: boolean; data: any[]; message: string }> {
    return await apiService.post<{ success: boolean; data: any[]; message: string }>(`${this.baseUrl}/bulk/place`, { orderIds });
  }

  async getOrderedSites(clientId: string): Promise<{ success: boolean; data: string[] }> {
    return await apiService.get<{ success: boolean; data: string[] }>(`${this.baseUrl}/ordered-sites/${clientId}`);
  }

  formatPrice(price: number): string {
    const roundedPrice = autoRoundPrice(price);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(roundedPrice);
  }

  getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
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

  // Utility function to get preview URL for documents
  getPreviewUrl(relativePath: string): string {
    if (!relativePath) return '';
    const filename = this.getFileName(relativePath);
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    return `${backendUrl}/api/guest-blog-orders/preview/${filename}?token=preview-access`;
  }

  // Extract DOCX content as HTML
  async extractDocxContent(relativePath: string): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!relativePath) return { success: false, error: 'No file path provided' };
    
    try {
      const filename = this.getFileName(relativePath);
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const extractUrl = `${backendUrl}/api/guest-blog-orders/extract/${filename}?token=preview-access`;
      
      console.log('Extracting DOCX content from:', extractUrl);
      
      const response = await fetch(extractUrl);
      const result = await response.json();
      
      console.log('DOCX extraction result:', result);
      
      return result;
    } catch (error) {
      console.error('Error extracting DOCX content:', error);
      return { success: false, error: 'Failed to extract document content' };
    }
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
      // Try using the dedicated download endpoint with token
      const filename = this.getFileName(fileUrl);
      const downloadUrl = `${backendUrl}/api/guest-blog-orders/download/${filename}?token=download-access`;
      
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
      // Fallback: try direct file URL with token
      const filename = this.getFileName(fileUrl);
      const fallbackUrl = `${backendUrl}/api/guest-blog-orders/preview/${filename}?token=preview-access`;
      window.open(fallbackUrl, '_blank');
    }
  }
}

export const guestBlogOrderService = new GuestBlogOrderService();
