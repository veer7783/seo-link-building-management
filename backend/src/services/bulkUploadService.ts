/**
 * Bulk Upload Service for Guest Blog Sites
 * Handles CSV/Excel parsing, validation, and data processing
 */

import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { normalizeUrl, validateNormalizedUrl } from '../utils/urlNormalization';

const prisma = new PrismaClient();

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

// Define available fields for mapping
export const GUEST_BLOG_SITE_COLUMNS = [
  { key: 'site_url', label: 'Site URL', required: true },
  { key: 'da', label: 'Domain Authority (DA)', required: false },
  { key: 'dr', label: 'Domain Rating (DR)', required: false },
  { key: 'ahrefs_traffic', label: 'Ahrefs Traffic', required: false },
  { key: 'ss', label: 'Spam Score (SS)', required: false },
  { key: 'tat', label: 'Turnaround Time (TAT)', required: false },
  { key: 'category', label: 'Category', required: false },
  { key: 'status', label: 'Status', required: true },
  { key: 'base_price', label: 'Base Price', required: true },
  { key: 'country', label: 'Country', required: false },
  { key: 'publisher', label: 'Publisher', required: false },
  { key: 'site_language', label: 'Site Language', required: true },
];

// Valid categories - must match GuestBlogSiteCategory enum in schema.prisma
const VALID_CATEGORIES = [
  'BUSINESS_ENTREPRENEURSHIP', 'MARKETING_SEO', 'TECHNOLOGY_GADGETS',
  'HEALTH_FITNESS', 'LIFESTYLE_WELLNESS', 'FINANCE_INVESTMENT',
  'EDUCATION_CAREER', 'TRAVEL_TOURISM', 'FOOD_NUTRITION',
  'REAL_ESTATE_HOME_IMPROVEMENT', 'AI_FUTURE_TECH', 'ECOMMERCE_STARTUPS',
  'SUSTAINABILITY_GREEN_LIVING', 'PARENTING_RELATIONSHIPS', 'FASHION_BEAUTY',
  'ENTERTAINMENT_MEDIA'
];

const VALID_STATUSES = ['ACTIVE', 'INACTIVE'];

/**
 * Parse CSV content into array of objects
 */
export const parseCSV = (csvContent: string): any[] => {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }

  return data;
};

/**
 * Parse Excel file buffer into array of objects
 */
export const parseExcel = (buffer: Buffer): any[] => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (data.length < 2) {
    throw new Error('Excel file must have at least a header row and one data row');
  }

  const headers = (data[0] as any[]).map(h => String(h).trim());
  const result: any[] = [];

  for (let i = 1; i < data.length; i++) {
    const values = data[i] as any[];
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] ? String(values[index]).trim() : '';
    });
    
    result.push(row);
  }

  return result;
};

/**
 * Auto-detect column mappings based on header similarity
 */
export const autoDetectColumnMappings = (csvHeaders: string[]): ColumnMapping[] => {
  const mappings: ColumnMapping[] = [];
  
  // Create a direct mapping table - EXACT matches only, no duplicates
  const exactMappingTable: Record<string, string> = {
    'site url': 'site_url',
    'domain authority (da)': 'da',
    'domain rating (dr)': 'dr',
    'ahrefs traffic': 'ahrefs_traffic',
    'spam score (ss)': 'ss',
    'turnaround time (tat)': 'tat',
    'category': 'category',
    'status': 'status',
    'base price': 'base_price',
    'country': 'country',
    'publisher': 'publisher',
    'site language': 'site_language',
  };

  // Track used fields to prevent duplicates
  const usedFields = new Set<string>();
  const usedCsvColumns = new Set<string>();

  // Process each CSV header with exact matching only
  csvHeaders.forEach(csvHeader => {
    const normalizedHeader = csvHeader.toLowerCase().trim();
    
    // Skip if already processed
    if (usedCsvColumns.has(csvHeader)) {
      return;
    }
    
    // Look for exact match in mapping table
    const guestBlogSiteField = exactMappingTable[normalizedHeader];
    
    if (guestBlogSiteField && !usedFields.has(guestBlogSiteField)) {
      mappings.push({
        csvColumn: csvHeader,
        guestBlogSiteField: guestBlogSiteField
      });
      usedFields.add(guestBlogSiteField);
      usedCsvColumns.add(csvHeader);
    }
  });

  return mappings;
};

/**
 * Validate a single row of data
 */
const validateRow = async (rowData: any, rowIndex: number, publishers: any[]): Promise<{ isValid: boolean; errors: ValidationError[] }> => {
  const errors: ValidationError[] = [];

  // Validate required fields (Site URL, Base Price, Status, Site Language)
  if (!rowData.site_url || !rowData.site_url.trim()) {
    errors.push({
      row: rowIndex,
      field: 'site_url',
      value: rowData.site_url,
      error: 'Site URL is required'
    });
  } else {
    // Validate and normalize URL
    try {
      const normalizedUrl = normalizeUrl(rowData.site_url);
      rowData.site_url = normalizedUrl; // Update the row data with normalized URL
    } catch (error) {
      errors.push({
        row: rowIndex,
        field: 'site_url',
        value: rowData.site_url,
        error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  if (!rowData.base_price || isNaN(parseFloat(rowData.base_price))) {
    errors.push({
      row: rowIndex,
      field: 'base_price',
      value: rowData.base_price,
      error: 'Valid base price is required'
    });
  }

  if (!rowData.status || !rowData.status.trim()) {
    errors.push({
      row: rowIndex,
      field: 'status',
      value: rowData.status,
      error: 'Status is required'
    });
  }

  if (!rowData.site_language || !rowData.site_language.trim()) {
    errors.push({
      row: rowIndex,
      field: 'site_language',
      value: rowData.site_language,
      error: 'Site Language is required'
    });
  }

  // Validate numeric fields
  if (rowData.da && (isNaN(parseInt(rowData.da)) || parseInt(rowData.da) < 0 || parseInt(rowData.da) > 100)) {
    errors.push({
      row: rowIndex,
      field: 'da',
      value: rowData.da,
      error: 'DA must be a number between 0 and 100'
    });
  }

  if (rowData.dr && (isNaN(parseInt(rowData.dr)) || parseInt(rowData.dr) < 0 || parseInt(rowData.dr) > 100)) {
    errors.push({
      row: rowIndex,
      field: 'dr',
      value: rowData.dr,
      error: 'DR must be a number between 0 and 100'
    });
  }

  if (rowData.ahrefs_traffic && (isNaN(parseInt(rowData.ahrefs_traffic)) || parseInt(rowData.ahrefs_traffic) < 0)) {
    errors.push({
      row: rowIndex,
      field: 'ahrefs_traffic',
      value: rowData.ahrefs_traffic,
      error: 'Ahrefs traffic must be a positive number'
    });
  }

  // Validate category
  if (rowData.category && !VALID_CATEGORIES.includes(rowData.category.toUpperCase())) {
    errors.push({
      row: rowIndex,
      field: 'category',
      value: rowData.category,
      error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
    });
  }

  // Validate status
  if (rowData.status && !VALID_STATUSES.includes(rowData.status.toUpperCase())) {
    errors.push({
      row: rowIndex,
      field: 'status',
      value: rowData.status,
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
    });
  }

  // Validate publisher exists
  if (rowData.publisher) {
    const publisherExists = publishers.some(p => 
      p.publisherName.toLowerCase() === rowData.publisher.toLowerCase() ||
      p.email.toLowerCase() === rowData.publisher.toLowerCase()
    );
    
    if (!publisherExists) {
      errors.push({
        row: rowIndex,
        field: 'publisher',
        value: rowData.publisher,
        error: 'Publisher not found. Use publisher name or email.'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generate preview data with validation
 */
export const generatePreview = async (
  parsedData: any[],
  columnMappings: ColumnMapping[],
  clientPercentage?: number
): Promise<BulkUploadPreview> => {
  // Get all publishers for validation
  // @ts-ignore - Prisma client has publisher at runtime
  const publishers = await prisma.publisher.findMany({
    select: { id: true, publisherName: true, email: true }
  });

  const previewData: PreviewRow[] = [];
  let validRows = 0;
  let invalidRows = 0;

  // Create mapping lookup
  const mappingLookup = columnMappings.reduce((acc, mapping) => {
    acc[mapping.guestBlogSiteField] = mapping.csvColumn;
    return acc;
  }, {} as Record<string, string>);

  for (let i = 0; i < Math.min(parsedData.length, 20); i++) {
    const rawRow = parsedData[i];
    
    // Map CSV data to GuestBlogSite fields
    const mappedRow: any = {};
    Object.keys(mappingLookup).forEach(field => {
      const csvColumn = mappingLookup[field];
      mappedRow[field] = rawRow[csvColumn] || '';
    });

    // Set defaults
    mappedRow.status = mappedRow.status || 'ACTIVE';
    mappedRow.site_language = mappedRow.site_language || 'en';

    // Validate row
    const validation = await validateRow(mappedRow, i + 1, publishers);

    // Calculate displayed price
    const basePrice = parseFloat(mappedRow.base_price) || 0;
    const percentage = clientPercentage || 25; // Default 25% markup
    const displayedPrice = basePrice + (basePrice * percentage / 100);

    const previewRow: PreviewRow = {
      rowIndex: i + 1,
      site_url: mappedRow.site_url || '',
      da: parseInt(mappedRow.da) || 0,
      dr: parseInt(mappedRow.dr) || 0,
      ahrefs_traffic: parseInt(mappedRow.ahrefs_traffic) || 0,
      ss: mappedRow.ss ? parseInt(mappedRow.ss) : undefined,
      tat: mappedRow.tat || '',
      category: mappedRow.category || '',
      status: mappedRow.status || 'ACTIVE',
      base_price: basePrice,
      country: mappedRow.country || '',
      publisher: mappedRow.publisher || '',
      site_language: mappedRow.site_language || 'en',
      displayed_price: displayedPrice,
      isValid: validation.isValid,
      errors: validation.errors
    };

    previewData.push(previewRow);

    if (validation.isValid) {
      validRows++;
    } else {
      invalidRows++;
    }
  }

  return {
    totalRows: parsedData.length,
    validRows,
    invalidRows,
    previewData,
    columnMappings,
    availableColumns: Object.keys(parsedData[0] || {})
  };
};

/**
 * Save bulk data to database
 */
export const saveBulkData = async (
  previewData: PreviewRow[],
  selectedRowIndexes: number[],
  publishers: any[]
): Promise<BulkUploadResult> => {
  const errors: string[] = [];
  let saved = 0;

  const selectedRows = previewData.filter(row => 
    selectedRowIndexes.includes(row.rowIndex) && row.isValid
  );

  for (const row of selectedRows) {
    try {
      // Find publisher
      const publisher = publishers.find(p => 
        p.publisherName.toLowerCase() === row.publisher.toLowerCase() ||
        p.email.toLowerCase() === row.publisher.toLowerCase()
      );

      if (!publisher) {
        errors.push(`Row ${row.rowIndex}: Publisher "${row.publisher}" not found`);
        continue;
      }

      // Check if site already exists
      // @ts-ignore - Prisma client has guestBlogSite at runtime
      const existingSite = await prisma.guestBlogSite.findUnique({
        where: { site_url: row.site_url }
      });

      if (existingSite) {
        errors.push(`Row ${row.rowIndex}: Site "${row.site_url}" already exists`);
        continue;
      }

      // Create guest blog site
      // @ts-ignore - Prisma client has guestBlogSite at runtime
      await prisma.guestBlogSite.create({
        data: {
          site_url: row.site_url,
          da: row.da,
          dr: row.dr,
          ahrefs_traffic: row.ahrefs_traffic,
          ss: row.ss,
          tat: row.tat,
          category: row.category.toUpperCase() as any,
          status: row.status.toUpperCase() as any,
          base_price: row.base_price,
          country: row.country,
          publisher_id: publisher.id,
          site_language: row.site_language,
        }
      });

      saved++;
    } catch (error: any) {
      errors.push(`Row ${row.rowIndex}: ${error.message}`);
    }
  }

  return {
    saved,
    errors,
    message: `Successfully saved ${saved} guest blog sites. ${errors.length} errors occurred.`
  };
};

/**
 * Generate CSV template for download with comprehensive demo data
 */
export const generateCSVTemplate = (): string => {
  // Use the exact column order that matches the CSV template file
  const headers = ['Site URL', 'Domain Authority (DA)', 'Domain Rating (DR)', 'Ahrefs Traffic', 'Spam Score (SS)', 'Turnaround Time (TAT)', 'Category', 'Status', 'Base Price', 'Country', 'Publisher', 'Site Language'];
  
  const sampleRows = [
    ['https://techcrunch.com', '95', '94', '15000000', '2', '2-3 days', 'TECHNOLOGY_GADGETS', 'ACTIVE', '500', 'US', 'TechCrunch Editor', 'en'],
    ['https://forbes.com/business', '92', '93', '12000000', '1', '3-5 days', 'BUSINESS_ENTREPRENEURSHIP', 'ACTIVE', '450', 'US', 'Forbes Business Team', 'en'],
    ['https://entrepreneur.com', '88', '87', '8500000', '3', '1-2 days', 'BUSINESS_ENTREPRENEURSHIP', 'ACTIVE', '400', 'US', 'Entrepreneur Magazine', 'en'],
    ['https://mashable.com', '85', '86', '7200000', '2', '2-4 days', 'TECHNOLOGY_GADGETS', 'ACTIVE', '350', 'US', 'Mashable Tech', 'en'],
    ['https://businessinsider.com', '90', '89', '9800000', '1', '3-4 days', 'BUSINESS_ENTREPRENEURSHIP', 'ACTIVE', '425', 'US', 'Business Insider', 'en'],
    ['https://healthline.com', '82', '83', '6500000', '1', '5-7 days', 'HEALTH_FITNESS', 'ACTIVE', '300', 'US', 'Healthline Editorial', 'en'],
    ['https://investopedia.com', '88', '87', '3800000', '1', '3-5 days', 'FINANCE_INVESTMENT', 'ACTIVE', '375', 'US', 'Investopedia Finance', 'en'],
    ['https://cnn.com/travel', '87', '88', '8900000', '2', '3-5 days', 'TRAVEL_TOURISM', 'ACTIVE', '400', 'US', 'CNN Travel', 'en'],
    ['https://foodnetwork.com', '81', '80', '3600000', '1', '4-6 days', 'FOOD_NUTRITION', 'ACTIVE', '250', 'US', 'Food Network', 'en'],
    ['https://vogue.com', '89', '88', '4200000', '1', '7-10 days', 'FASHION_BEAUTY', 'ACTIVE', '450', 'US', 'Vogue Fashion', 'en']
  ];

  const csvContent = [headers.join(',')];
  sampleRows.forEach(row => {
    csvContent.push(row.join(','));
  });

  return csvContent.join('\n');
};
