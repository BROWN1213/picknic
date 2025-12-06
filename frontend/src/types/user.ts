export interface UserProfile {
  userId: string;
  username: string;
  points: number;
  rank: number;
  level: string;
  levelIcon: string;
  verifiedSchool: string | null;
  isSystemAccount?: boolean;
  profileCompleted: boolean;
}
