export interface PointHistory {
  type: 'vote' | 'create' | 'attendance' | 'event' | 'use_reward';
  description: string;
  points: number;
  timestamp: string;
}

export interface PointHistoryResponse {
  currentPoints: number;
  history: PointHistory[];
}

export interface DailyCheckInResponse {
  earnedPoints: number;
  totalPoints: number;
  consecutiveDays: number | null;
}

export interface DailyLimitResponse {
  voteRemaining: number;
  createRemaining: number;
  voteLimit: number;
  createLimit: number;
}
