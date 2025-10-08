import { apiService } from './api';
import { User } from '../contexts/AuthContext';

interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

interface UserResponse {
  success: boolean;
  user: User;
}

class AuthService {
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await apiService.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    if (!response.success) {
      throw new Error('Login failed');
    }

    return {
      user: response.user,
      token: response.token,
    };
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<UserResponse>('/auth/me');
    
    if (!response.success) {
      throw new Error('Failed to get user data');
    }

    return response.user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiService.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }
}

export const authService = new AuthService();
