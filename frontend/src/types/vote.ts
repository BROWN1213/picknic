export interface VoteOption {
  id: string;
  text: string;
  emoji?: string;
  image?: string;
  votes: number;
}

export interface Vote {
  id: string;
  type: 'balance' | 'multiple' | 'ox';
  title: string;
  description?: string;
  image?: string; // Vote 이미지 URL
  options: VoteOption[];
  totalVotes: number;
  category: string;
  schoolName?: string;
  isHot?: boolean;
  timeLeft?: string;
  points?: number;
  userVoted?: string | null;
  createdAt?: string;
  expiresAt?: string;
  status?: 'active' | 'closed' | 'expired';
}

export interface CreateVoteRequest {
  type: 'balance' | 'multiple' | 'ox';
  title: string;
  description?: string;
  imageUrl?: string; // S3 이미지 URL
  options: Array<{
    text: string;
    emoji?: string;
    image?: string;
  }>;
  category: string;
  schoolOnly?: boolean;
  duration?: number;
  points?: number;
}

export interface CastVoteRequest {
  optionId: string;
}

export interface VoteResponse {
  id: number;
  type: string;
  title: string;
  description?: string;
  imageUrl?: string; // Vote 이미지 URL
  options: Array<{
    id: number;
    optionText: string;
    emoji?: string;
    imageUrl?: string;
    voteCount: number;
    percentage?: number;
  }>;
  totalVotes: number;
  category: string;
  schoolName?: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  hasVoted?: boolean;
  userSelectedOptionId?: number;
  creatorId: string;
}

export interface VoteResultResponse {
  id: number;
  title: string;
  totalVotes: number;
  createdAt?: string;
  expiresAt?: string;
  isActive?: boolean;
  category?: string;
  schoolName?: string;
  results: Array<{
    optionId: number;
    text: string;
    voteCount: number;
    percentage: number;
  }>;
  analysis?: {
    mostParticipatedAgeGroup: string;
    mostParticipatedPercentage: number;
    genderStats: Record<string, number>;
    ageGroupStats: Array<{
      label: string;
      percentage: number;
    }>;
    relatedInterests: string[];
    funFact: string;
    optionAnalyses?: Array<{
      optionId: number;
      optionText: string;
      genderStats: Record<string, number>;
      topInterests: string[];
    }>;
  };
}
