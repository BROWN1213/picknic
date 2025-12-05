import { apiClient } from '../lib/api';
import type { ApiResponse } from '../lib/api';
import type { RewardListResponse, RewardRedeemResponse } from '../types/reward';

export const rewardService = {
  async getRewards(): Promise<RewardListResponse> {
    const response = await apiClient.get<ApiResponse<RewardListResponse>>('/v1/rewards');
    return response.data;
  },

  async redeemReward(rewardId: number): Promise<RewardRedeemResponse> {
    const response = await apiClient.post<ApiResponse<RewardRedeemResponse>>(
      `/rewards/${rewardId}/redeem`
    );
    return response.data;
  },
};
