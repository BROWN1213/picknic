import { apiClient } from '../lib/api';
import type { ApiResponse } from '../lib/api';
import type { PointHistoryResponse, DailyCheckInResponse, DailyLimitResponse } from '../types/point';

export const pointService = {
  async getPointHistory(limit: number = 20, offset: number = 0): Promise<PointHistoryResponse> {
    const response = await apiClient.get<ApiResponse<PointHistoryResponse>>(
      `/points/history?limit=${limit}&offset=${offset}`
    );
    return response.data;
  },

  async dailyCheckIn(): Promise<DailyCheckInResponse> {
    const response = await apiClient.post<ApiResponse<DailyCheckInResponse>>('/daily-check-in');
    return response.data;
  },

  async getDailyLimit(): Promise<DailyLimitResponse> {
    const response = await apiClient.get<ApiResponse<DailyLimitResponse>>('/points/daily-limit');
    return response.data;
  },
};
