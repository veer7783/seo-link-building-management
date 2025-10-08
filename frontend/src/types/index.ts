export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  company?: string;
  address?: string;
  percentage: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientData {
  name: string;
  email: string;
  phone?: string;
  country?: string;
  company?: string;
  address?: string;
  percentage?: number;
}

export interface UpdateClientData extends Partial<CreateClientData> {
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface Project {
  id: string;
  projectName: string;
  websiteUrl?: string;
  companyName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  client?: {
    id: string;
    name: string;
    email: string;
    company?: string;
  };
  _count?: {
    orders: number;
  };
}

export interface CreateProjectData {
  projectName: string;
  websiteUrl?: string;
  companyName?: string;
  clientId: string;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  isActive?: boolean;
}

export interface Publisher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  paymentDetails?: {
    method: string;
    details: any;
  };
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface Site {
  id: string;
  publisherId: string;
  publisher?: Publisher;
  domain: string;
  url: string;
  domainRating: number;
  monthlyTraffic: number;
  category: string;
  language: string;
  country: string;
  pricing: {
    guestPost: number;
    linkInsertion: number;
    currency: string;
  };
  internalCost: {
    guestPost: number;
    linkInsertion: number;
    currency: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  projectId: string;
  project?: Project;
  type: 'GUEST_POST' | 'LINK_INSERTION';
  status: 'BRIEF_PENDING' | 'CONTENT_CREATION' | 'CONTENT_REVIEW' | 'PUBLISHED' | 'COMPLETED';
  totalAmount: number;
  currency: string;
  targetUrl: string;
  anchorText: string;
  anchorType: 'EXACT' | 'PARTIAL' | 'BRANDED' | 'GENERIC';
  requirements?: string;
  createdAt: string;
  updatedAt: string;
  sites?: Site[];
}

export interface Content {
  id: string;
  orderId: string;
  order?: Order;
  type: 'BRIEF' | 'DRAFT' | 'FINAL';
  title?: string;
  content?: string;
  wordCount?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Placement {
  id: string;
  orderId: string;
  order?: Order;
  siteId: string;
  site?: Site;
  publishedUrl?: string;
  linkStatus: 'PENDING' | 'LIVE' | 'REMOVED';
  lastChecked?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  client?: Client;
  amount: number;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  dueDate: string;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  user?: User;
  action: string;
  entityType: string;
  entityId: string;
  changes?: any;
  metadata?: any;
  createdAt: string;
}

export interface PaginatedResponse<T> {
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
