import { apiService } from './api';
import { Project, PaginatedResponse, ApiResponse, CreateProjectData, UpdateProjectData } from '../types';

export interface ProjectFilters {
  search?: string;
  clientId?: string;
  page?: number;
  limit?: number;
}

class ProjectService {
  async getProjects(filters: ProjectFilters = {}): Promise<PaginatedResponse<Project>> {
    const response = await apiService.get<any>('/projects', filters);
    // Backend returns { success: true, data: [...], pagination: {...} }
    return {
      data: response.data || [],
      pagination: response.pagination || { page: 0, limit: 25, total: 0, pages: 0 }
    };
  }

  async getProject(id: string): Promise<Project> {
    const response = await apiService.get<ApiResponse<Project>>(`/projects/${id}`);
    return response.data;
  }

  async createProject(data: CreateProjectData): Promise<Project> {
    const response = await apiService.post<ApiResponse<Project>>('/projects', data);
    return response.data;
  }

  async updateProject(id: string, data: UpdateProjectData): Promise<Project> {
    const response = await apiService.put<ApiResponse<Project>>(`/projects/${id}`, data);
    return response.data;
  }

  async deleteProject(id: string): Promise<void> {
    await apiService.delete(`/projects/${id}`);
  }
}

export const projectService = new ProjectService();
