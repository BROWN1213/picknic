import { apiClient } from '../lib/api';
import type { ApiResponse } from '../lib/api';
import type { PersonalRankingResponse, SchoolRankingResponse } from '../types/ranking';

export const rankingService = {
  async getPersonalRanking(limit: number = 20, offset: number = 0): Promise<PersonalRankingResponse> {
    const response = await apiClient.get<ApiResponse<PersonalRankingResponse>>(
      `/rankings/personal?limit=${limit}&offset=${offset}`
    );
    return response.data;
  },

  async getSchoolRanking(limit: number = 20, offset: number = 0): Promise<SchoolRankingResponse> {
    const response = await apiClient.get<ApiResponse<SchoolRankingResponse>>(
      `/rankings/schools?limit=${limit}&offset=${offset}`
    );
    return response.data;
  },
};
