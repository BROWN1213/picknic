import { apiClient, type ApiResponse } from '../lib/api';

export interface Notification {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  voteId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationDisplay {
  id: string;
  title: string;
  message: string;
  time: string;
  voteId?: string;
  isRead: boolean;
}

/**
 * 백엔드 Notification을 프론트엔드 NotificationDisplay 형식으로 변환
 */
function convertToNotificationDisplay(notification: Notification): NotificationDisplay {
  // 시간 차이 계산
  const now = new Date();
  const createdAt = new Date(notification.createdAt);
  const diffMs = now.getTime() - createdAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let timeText: string;
  if (diffMins < 1) {
    timeText = '방금 전';
  } else if (diffMins < 60) {
    timeText = `${diffMins}분 전`;
  } else if (diffHours < 24) {
    timeText = `${diffHours}시간 전`;
  } else {
    timeText = `${diffDays}일 전`;
  }

  return {
    id: notification.id.toString(),
    title: notification.title,
    message: notification.message,
    time: timeText,
    voteId: notification.voteId?.toString(),
    isRead: notification.isRead,
  };
}

export const notificationService = {
  /**
   * 내 알림 목록 조회
   */
  async getNotifications(): Promise<NotificationDisplay[]> {
    const response = await apiClient.get<ApiResponse<Notification[]>>('/notifications');
    return response.data.map(convertToNotificationDisplay);
  },

  /**
   * 알림 읽음 처리
   */
  async markAsRead(id: string): Promise<void> {
    await apiClient.patch<ApiResponse<string>>(`/notifications/${id}/read`);
  },
};
