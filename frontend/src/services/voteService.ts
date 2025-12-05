import { apiClient } from '../lib/api';
import type { ApiResponse } from '../lib/api';
import type {
  VoteResponse,
  CreateVoteRequest,
  CastVoteRequest,
  VoteResultResponse
} from '../types/vote';

// Helper to convert backend response to frontend Vote type
const convertToVote = (backendVote: any): any => {
  return {
    id: String(backendVote.id),
    type: backendVote.type || 'balance',
    title: backendVote.title,
    description: backendVote.description,
    image: backendVote.imageUrl, // Vote 이미지
    category: backendVote.category || '일상',
    options: backendVote.options.map((opt: any) => ({
      id: String(opt.id),
      text: opt.optionText,
      votes: opt.voteCount,
      image: opt.imageUrl
    })),
    totalVotes: backendVote.totalVotes,
    isHot: backendVote.totalVotes > 100,
    timeLeft: backendVote.timeLeft, // Use actual time left from backend
    userVoted: backendVote.hasVoted ? String(backendVote.userSelectedOptionId) : null,
    status: backendVote.isActive ? 'active' : 'closed',
    createdAt: backendVote.createdAt,
    creatorId: backendVote.creatorId,
    schoolName: backendVote.schoolName
  };
};

export const voteService = {
  async uploadImage(imageFile: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await apiClient.post<ApiResponse<{ imageUrl: string }>>('/votes/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.imageUrl;
  },

  async getVotes(status?: string, creatorId?: string): Promise<VoteResponse[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (creatorId) params.append('creatorId', creatorId);

    const queryString = params.toString();
    const endpoint = queryString ? `/votes?${queryString}` : '/votes';

    const response = await apiClient.get<ApiResponse<any[]>>(endpoint);
    return response.data.map(convertToVote);
  },

  async getVote(id: number): Promise<VoteResponse> {
    const response = await apiClient.get<ApiResponse<any>>(`/votes/${id}`);
    return convertToVote(response.data);
  },

  async createVote(data: CreateVoteRequest): Promise<VoteResponse> {
    const payload = {
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl, // S3 이미지 URL 추가
      category: data.category,
      options: data.options.map(opt => opt.text)
    };
    const response = await apiClient.post<ApiResponse<any>>('/votes', payload);
    return convertToVote(response.data);
  },

  async castVote(voteId: number, data: CastVoteRequest): Promise<VoteResponse> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/votes/${voteId}/vote`,
      data
    );
    return convertToVote(response.data);
  },

  async updateVote(id: number, data: CreateVoteRequest): Promise<VoteResponse> {
    const response = await apiClient.put<ApiResponse<any>>(`/votes/${id}`, data);
    return convertToVote(response.data);
  },

  async deleteVote(id: number): Promise<string> {
    const response = await apiClient.delete<ApiResponse<string>>(`/votes/${id}`);
    return response.data;
  },

  async closeVote(id: number): Promise<VoteResponse> {
    const response = await apiClient.patch<ApiResponse<any>>(`/votes/${id}/close`);
    return convertToVote(response.data);
  },

  async getMyVotes(): Promise<VoteResponse[]> {
    const response = await apiClient.get<ApiResponse<any[]>>('/votes/my');
    return response.data.map(convertToVote);
  },

  async getParticipatedVotes(): Promise<VoteResponse[]> {
    const response = await apiClient.get<ApiResponse<any[]>>('/votes/participated');
    return response.data.map(convertToVote);
  },

  async getVoteResults(id: number): Promise<VoteResultResponse> {
    const response = await apiClient.get<ApiResponse<VoteResultResponse>>(`/votes/${id}/results`);
    return response.data;
  },
};
