/**
 * Bulk Upload Service for Guest Blog Sites Frontend
 */

import { apiService } from './api';

export interface ColumnMapping {
  csvColumn: string;
  guestBlogSiteField: string;
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  error: string;
}

export interface PreviewRow {
  rowIndex: number;
  site_url: string;
  da: number;
  dr: number;
  ahrefs_traffic: number;
  ss?: number;
  tat: string;
  category: string;
  status: string;
  base_price: number;
  country: string;
  publisher: string;
  site_language: string;
  displayed_price: number;
  isValid: boolean;
  errors: ValidationError[];
}

export interface BulkUploadPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  previewData: PreviewRow[];
  columnMappings: ColumnMapping[];
  availableColumns: string[];
}

export interface BulkUploadResult {
  saved: number;
  errors: string[];
  message: string;
}

export interface ParseResponse {
  totalRows: number;
  availableColumns: string[];
  autoMappings: ColumnMapping[];
  guestBlogSiteColumns: Array<{
    key: string;
    label: string;
    required: boolean;
  }>;
  clientPercentage: number;
  sessionId: string;
}

class BulkUploadService {
  /**
   * Download CSV template
   */
  async downloadTemplate(): Promise<Blob> {
    // For blob downloads, we need to use fetch directly with proper base URL
    const token = localStorage.getItem('token');
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const response = await fetch(`${baseURL}/api/guest-sites/bulk-upload/template`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.statusText}`);
    }
    
    return response.blob();
  }

  /**
   * Parse uploaded file and get initial data
   */
  async parseFile(file: File, clientId?: string): Promise<ParseResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (clientId) {
      formData.append('clientId', clientId);
    }

    const response = await apiService.upload<{ success: boolean; data: ParseResponse }>('/guest-sites/bulk-upload/parse', formData);
    return response.data;
  }

  /**
   * Generate preview with column mappings
   */
  async generatePreview(
    file: File,
    mappings: ColumnMapping[],
    clientId?: string
  ): Promise<BulkUploadPreview> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mappings', JSON.stringify(mappings));
    if (clientId) {
      formData.append('clientId', clientId);
    }

    const response = await apiService.upload<{ success: boolean; data: BulkUploadPreview }>('/guest-sites/bulk-upload/preview', formData);
    return response.data;
  }

  /**
   * Save selected rows from preview
   */
  async savePreviewData(
    previewData: PreviewRow[],
    selectedRows: number[]
  ): Promise<BulkUploadResult> {
    const response = await apiService.post<{ success: boolean; data: BulkUploadResult }>('/guest-sites/bulk-upload/save', {
      previewData,
      selectedRows,
    });

    return response.data;
  }
}

export const bulkUploadService = new BulkUploadService();
