import { apiService } from './api';

export interface DashboardMetrics {
  totalOrders: number;
  activeOrders: number;
  totalPlacements: number;
  livePlacements: number;
  totalRevenue: number;
  monthlyRevenue: number;
  ordersByStage: {
    stage: string;
    count: number;
  }[];
  recentActivity: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }[];
  slaBreaches: {
    id: string;
    orderNumber: string;
    clientName: string;
    daysOverdue: number;
    stage: string;
  }[];
  linkHealthSummary: {
    total: number;
    live: number;
    removed: number;
    checking: number;
  };
}

class DashboardService {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await apiService.get<{ success: boolean; data: DashboardMetrics }>('/reports/dashboard');
    return response.data;
  }
}

export const dashboardService = new DashboardService();
