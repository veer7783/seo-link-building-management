/**
 * Bulk Upload Service for Guest Blog Sites
 * Handles CSV/Excel parsing, validation, and data processing
 */

import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { normalizeUrl, validateNormalizedUrl } from '../utils/urlNormalization';
import { autoRoundPrice, parseAndRoundPrice } from '../utils/priceRounding';

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
// Define expected column order and requirements
export const GUEST_BLOG_SITE_COLUMNS = [
  { key: 'site_url', label: 'Site URL', required: true, order: 1 },
  { key: 'publisher', label: 'Publisher Email', required: true, order: 2 },
  { key: 'da', label: 'Domain Authority (DA)', required: false, order: 3 },
  { key: 'dr', label: 'Domain Rating (DR)', required: false, order: 4 },
  { key: 'ahrefs_traffic', label: 'Ahrefs Traffic', required: false, order: 5 },
  { key: 'ss', label: 'Spam Score (SS)', required: false, order: 6 },
  { key: 'category', label: 'Category', required: true, order: 7 },
  { key: 'country', label: 'Country', required: true, order: 8 },
  { key: 'site_language', label: 'Site Language', required: true, order: 9 },
  { key: 'tat', label: 'Turnaround Time (TAT)', required: true, order: 10 },
  { key: 'base_price', label: 'Base Price', required: true, order: 11 },
  { key: 'status', label: 'Status', required: false, order: 12 },
];

// Expected column order for CSV template
export const EXPECTED_COLUMN_ORDER = [
  'Site URL', 'Publisher Email', 'DA', 'DR', 'Traffic', 'SS', 
  'Category', 'Country', 'Language', 'TAT', 'Base Price', 'Status'
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
    'publisher email': 'publisher',
    'publisher': 'publisher', // Keep backward compatibility
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
 * Validate column order against expected format
 */
export const validateColumnOrder = (csvHeaders: string[]): { isValid: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  let isValid = true;

  // Normalize headers for comparison
  const normalizedHeaders = csvHeaders.map(h => h.toLowerCase().trim());
  const expectedNormalized = EXPECTED_COLUMN_ORDER.map(h => h.toLowerCase().trim());

  // Check if headers match expected order
  if (normalizedHeaders.length !== expectedNormalized.length) {
    warnings.push(`Column count mismatch — expected ${expectedNormalized.length} columns, found ${normalizedHeaders.length}`);
    isValid = false;
  }

  // Check order and missing columns
  expectedNormalized.forEach((expected, index) => {
    if (index < normalizedHeaders.length) {
      if (normalizedHeaders[index] !== expected) {
        warnings.push(`Column order mismatch at position ${index + 1} — expected "${EXPECTED_COLUMN_ORDER[index]}", found "${csvHeaders[index]}"`);
        isValid = false;
      }
    } else {
      warnings.push(`Missing column: "${EXPECTED_COLUMN_ORDER[index]}"`);
      isValid = false;
    }
  });

  return { isValid, warnings };
};

/**
 * Validate a single row of data
 */
const validateRow = async (rowData: any, rowIndex: number, publishers: any[]): Promise<{ isValid: boolean; errors: ValidationError[] }> => {
  const errors: ValidationError[] = [];

  // Validate required fields: Site URL, Publisher, Category, Country, Language, TAT, Base Price
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

  if (!rowData.publisher || !rowData.publisher.trim()) {
    errors.push({
      row: rowIndex,
      field: 'publisher',
      value: rowData.publisher,
      error: 'Publisher Email is required'
    });
  }

  if (!rowData.category || !rowData.category.trim()) {
    errors.push({
      row: rowIndex,
      field: 'category',
      value: rowData.category,
      error: 'Category is required'
    });
  }

  if (!rowData.country || !rowData.country.trim()) {
    errors.push({
      row: rowIndex,
      field: 'country',
      value: rowData.country,
      error: 'Country is required'
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

  if (!rowData.tat || !rowData.tat.trim()) {
    errors.push({
      row: rowIndex,
      field: 'tat',
      value: rowData.tat,
      error: 'TAT is required'
    });
  }

  if (!rowData.base_price || isNaN(parseFloat(rowData.base_price))) {
    errors.push({
      row: rowIndex,
      field: 'base_price',
      value: rowData.base_price,
      error: 'Base Price is required and must be a valid number'
    });
  } else {
    // Auto-round the price and update the row data
    const originalPrice = parseFloat(rowData.base_price);
    const roundedPrice = autoRoundPrice(originalPrice);
    rowData.base_price = roundedPrice; // Update with rounded value
  }

  // Optional fields - validate only if provided
  if (rowData.da && (isNaN(parseInt(rowData.da)) || parseInt(rowData.da) < 0 || parseInt(rowData.da) > 100)) {
    errors.push({
      row: rowIndex,
      field: 'da',
      value: rowData.da,
      error: 'DA must be between 0 and 100'
    });
  }

  if (rowData.dr && (isNaN(parseInt(rowData.dr)) || parseInt(rowData.dr) < 0 || parseInt(rowData.dr) > 100)) {
    errors.push({
      row: rowIndex,
      field: 'dr',
      value: rowData.dr,
      error: 'DR must be between 0 and 100'
    });
  }

  if (rowData.ahrefs_traffic && (isNaN(parseInt(rowData.ahrefs_traffic)) || parseInt(rowData.ahrefs_traffic) < 0)) {
    errors.push({
      row: rowIndex,
      field: 'ahrefs_traffic',
      value: rowData.ahrefs_traffic,
      error: 'Traffic must be a positive number'
    });
  }

  if (rowData.ss && (isNaN(parseInt(rowData.ss)) || parseInt(rowData.ss) < 0 || parseInt(rowData.ss) > 100)) {
    errors.push({
      row: rowIndex,
      field: 'ss',
      value: rowData.ss,
      error: 'SS must be between 0 and 100'
    });
  }

  if (rowData.status && !['ACTIVE', 'INACTIVE'].includes(rowData.status.toUpperCase())) {
    errors.push({
      row: rowIndex,
      field: 'status',
      value: rowData.status,
      error: 'Status must be ACTIVE or INACTIVE'
    });
  }

  // Validate category if provided
  if (rowData.category && !VALID_CATEGORIES.includes(rowData.category.toUpperCase())) {
    errors.push({
      row: rowIndex,
      field: 'category',
      value: rowData.category,
      error: 'Invalid category'
    });
  }

  // Validate publisher exists by email (preferred) or name (backward compatibility)
  if (rowData.publisher && rowData.publisher.trim()) {
    const publisherExists = publishers.some(p => 
      (p.email && p.email.toLowerCase() === rowData.publisher.toLowerCase()) ||
      p.publisherName.toLowerCase() === rowData.publisher.toLowerCase()
    );
    
    if (!publisherExists) {
      errors.push({
        row: rowIndex,
        field: 'publisher',
        value: rowData.publisher,
        error: 'Publisher with this email does not exist'
      });
    }
  }

  return { isValid: errors.length === 0, errors };
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

    // Calculate displayed price with rounded base price
    const originalBasePrice = parseFloat(mappedRow.base_price) || 0;
    const roundedBasePrice = autoRoundPrice(originalBasePrice);
    const percentage = clientPercentage || 25; // Default 25% markup
    const displayedPrice = roundedBasePrice + (roundedBasePrice * percentage / 100);

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
      base_price: roundedBasePrice,
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
  console.log('🔥 GENERATING CSV TEMPLATE WITH UPDATED FORMAT');
  // Use the exact column order that matches the updated CSV template file
  const headers = ['Site URL', 'Publisher Email', 'DA', 'DR', 'Traffic', 'SS', 'Category', 'Country', 'Language', 'TAT', 'Base Price', 'Status'];
  console.log('🔥 Headers:', headers);
  
  const sampleRows = [
    ['https://techcrunch.com', 'editor@techcrunch.com', '95', '94', '15000000', '2', 'TECHNOLOGY_GADGETS', 'US', 'en', '2-3 days', '500', 'ACTIVE'],
    ['https://forbes.com/business', 'business@forbes.com', '92', '93', '12000000', '1', 'BUSINESS_ENTREPRENEURSHIP', 'US', 'en', '3-5 days', '450', 'ACTIVE'],
    ['https://entrepreneur.com', 'editor@entrepreneur.com', '88', '87', '8500000', '3', 'BUSINESS_ENTREPRENEURSHIP', 'US', 'en', '1-2 days', '400', 'ACTIVE'],
    ['https://mashable.com', 'tech@mashable.com', '85', '86', '7200000', '2', 'TECHNOLOGY_GADGETS', 'US', 'en', '2-4 days', '350', 'ACTIVE'],
    ['https://businessinsider.com', 'editor@businessinsider.com', '90', '89', '9800000', '1', 'BUSINESS_ENTREPRENEURSHIP', 'US', 'en', '3-4 days', '425', 'ACTIVE'],
    ['https://healthline.com', 'editorial@healthline.com', '82', '83', '6500000', '1', 'HEALTH_FITNESS', 'US', 'en', '5-7 days', '300', 'ACTIVE'],
    ['https://investopedia.com', 'finance@investopedia.com', '88', '87', '3800000', '1', 'FINANCE_INVESTMENT', 'US', 'en', '3-5 days', '375', 'ACTIVE'],
    ['https://cnn.com/travel', 'travel@cnn.com', '87', '88', '8900000', '2', 'TRAVEL_TOURISM', 'US', 'en', '3-5 days', '400', 'ACTIVE'],
    ['https://foodnetwork.com', 'editor@foodnetwork.com', '81', '80', '3600000', '1', 'FOOD_NUTRITION', 'US', 'en', '4-6 days', '250', 'ACTIVE'],
    ['https://vogue.com', 'fashion@vogue.com', '89', '88', '4200000', '1', 'FASHION_BEAUTY', 'US', 'en', '7-10 days', '450', 'ACTIVE']
  ];

  const csvContent = [headers.join(',')];
  sampleRows.forEach(row => {
    csvContent.push(row.join(','));
  });

  return csvContent.join('\n');
};
