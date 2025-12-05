import { apiClient } from '../lib/api';
import type { ApiResponse } from '../lib/api';
import type { UserProfile } from '../types/user';

export const userService = {
  async getMyProfile(): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfile>>('/users/me');
    return response.data;
  },
};
