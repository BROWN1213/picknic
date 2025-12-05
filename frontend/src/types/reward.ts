export interface Reward {
  id: number;
  name: string;
  description: string;
  cost: number;
  stock: number;
  imageUrl?: string;
}

export interface RewardListResponse {
  rewards: Reward[];
}

export interface RewardRedeemResponse {
  message: string;
  rewardId: number;
  remainingPoints: number;
}
