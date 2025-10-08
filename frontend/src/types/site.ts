export interface Site {
  id: string;
  domain: string; // Site URL
  domainAuthority: number; // DA (Domain Authority)
  domainRating: number; // DR (Domain Rating)
  monthlyTraffic: number; // Ahrefs Traffic
  spamScore?: number; // SS (Spam Score)
  turnaroundTime: string; // TAT (Turnaround Time)
  category: string;
  language: string; // Site Language
  country: string;
  basePrice: number; // Base Price
  internalCost: number;
  isActive: boolean; // Status
  createdAt: string;
  updatedAt: string;
  publisherId: string;
  publisher: {
    id: string;
    publisherName: string;
  };
}

export interface SitePricing {
  siteId: string;
  basePrice: number;
  clientPercentage: number;
  finalPrice: number;
  isOverride: boolean;
  overridePrice?: number;
}

export interface CreateSiteData {
  domain: string;
  domainAuthority: number;
  domainRating: number;
  monthlyTraffic: number;
  spamScore?: number;
  turnaroundTime: string;
  category: string;
  language: string;
  country: string;
  basePrice: number;
  internalCost: number;
  publisherId: string;
}

export interface UpdateSiteData {
  domain?: string;
  domainAuthority?: number;
  domainRating?: number;
  monthlyTraffic?: number;
  spamScore?: number;
  turnaroundTime?: string;
  category?: string;
  language?: string;
  country?: string;
  basePrice?: number;
  internalCost?: number;
  isActive?: boolean;
  publisherId?: string;
}

export interface SiteFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  country?: string;
  publisherId?: string;
  isActive?: boolean;
}
