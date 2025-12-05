import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Gift,
  Zap,
  Calendar,
  TrendingUp,
  Award,
  Settings,
  LogOut,
  Loader2,
  Ticket
} from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { pointService } from "../services/pointService";
import { voteService } from "../services/voteService";
import { toast } from "sonner";
import type { PointHistory, DailyLimitResponse } from "../types/point";

interface ProfileSectionProps {
  userPoints: number;
  userRank: number;
  verifiedSchool: string | null;
  nickname?: string;
  level?: string;
  levelIcon?: string;
  onRewardClick: () => void;
  onLogout: () => void;
  dailyLimit?: DailyLimitResponse;
}

export function ProfileSection({
  userPoints,
  userRank,
  verifiedSchool,
  nickname,
  level = "실버",
  levelIcon = "🥈",
  onRewardClick,
  onLogout,
  dailyLimit,
}: ProfileSectionProps) {
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [participatedCount, setParticipatedCount] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [redeemedRewards, setRedeemedRewards] = useState<PointHistory[]>([]);

  useEffect(() => {
    const loadProfileData = async () => {
      setIsLoading(true);
      try {
        const [historyData, participatedData, createdData] = await Promise.all([
          pointService.getPointHistory(5), // Get recent 5 items
          voteService.getParticipatedVotes(),
          voteService.getMyVotes()
        ]);

        setPointHistory(historyData?.history || []);
        setParticipatedCount(participatedData?.length || 0);
        setCreatedCount(createdData?.length || 0);

        // Filter redeemed rewards from history
        const rewards = historyData?.history.filter(
          item => item.description.includes('리워드 교환')
        ) || [];
        setRedeemedRewards(rewards);

        // Check if user has checked in today
        const today = new Date().toISOString().split('T')[0];
        const hasCheckedIn = historyData?.history.some(
          item => item.description.includes('출석') && item.timestamp.startsWith(today)
        );
        setHasCheckedInToday(hasCheckedIn || false);
      } catch (error) {
        console.error('Failed to load profile data:', error);
        // Set empty defaults on error to prevent crash
        setPointHistory([]);
        setParticipatedCount(0);
        setCreatedCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, []);

  const handleDailyCheckIn = async () => {
    if (isCheckingIn) return;

    setIsCheckingIn(true);
    try {
      const response = await pointService.dailyCheckIn();
      toast.success(`출석 체크 완료! +${response.earnedPoints}P`);
      setHasCheckedInToday(true);
      // Refresh history
      const historyData = await pointService.getPointHistory(5);
      setPointHistory(historyData.history);
    } catch (error: any) {
      console.error('Daily check-in failed:', error);
      // Display the error message from backend
      const errorMessage = error.message || '출석 체크 중 오류가 발생했습니다.';
      toast.error(errorMessage);

      // If already checked in today (400 error with specific message), update state
      if (error.status === 400 && error.message?.includes('이미 출석 체크')) {
        setHasCheckedInToday(true);
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  const stats = [
    { label: "참여한 투표", value: participatedCount, icon: "📊" },
    { label: "만든 투표", value: createdCount, icon: "✨" },
    { label: "출석일", value: "-", icon: "📅" }, // API support needed for total check-ins
    { label: "정답률", value: "-", icon: "🎯" }, // API support needed for accuracy
  ];

  const achievements = [
    { emoji: "🔥", name: "7일 연속 출석", unlocked: true },
    { emoji: "💯", name: "투표 100회 참여", unlocked: participatedCount >= 100 },
    { emoji: "🎯", name: "정답률 70%", unlocked: false },
    { emoji: "👑", name: "투표왕", unlocked: createdCount >= 10 },
  ];

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    return `${Math.floor(diffInSeconds / 86400)}일 전`;
  };

  const getPointIcon = (reason: string) => {
    if (reason.includes('VOTE')) return "📊";
    if (reason.includes('CREATE')) return "✨";
    if (reason.includes('CHECK_IN')) return "📅";
    if (reason.includes('WIN')) return "🎉";
    return "💰";
  };

  // Calculate next level threshold based on current level
  const getNextLevelInfo = () => {
    const levelThresholds: { [key: string]: number } = {
      '브론즈': 500,
      '실버': 1500,
      '골드': 3000,
      '다이아': 5000,
      '마스터': Number.MAX_SAFE_INTEGER,
    };

    const nextThreshold = levelThresholds[level || '실버'];
    if (level === '마스터' || userPoints >= nextThreshold) {
      return { pointsRemaining: 0, progressPercent: 100, isMaxLevel: true };
    }

    const currentThreshold = Object.entries(levelThresholds).find(([lvl]) => lvl === level)?.[1] || 0;
    const prevThreshold = Object.values(levelThresholds).find(t => t < currentThreshold) || 0;
    const progressPercent = ((userPoints - prevThreshold) / (nextThreshold - prevThreshold)) * 100;

    return {
      pointsRemaining: nextThreshold - userPoints,
      progressPercent: Math.min(progressPercent, 100),
      isMaxLevel: false,
    };
  };

  const nextLevelInfo = getNextLevelInfo();

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="relative overflow-hidden border-white/10 bg-gradient-to-br from-[#7c3aed]/20 via-[#db2777]/20 to-[#f97316]/20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed]/10 via-transparent to-transparent" />

        <div className="relative p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-white/20 bg-gradient-to-br from-[#7c3aed] to-[#db2777]">
                <AvatarFallback className="text-2xl bg-transparent text-white">
                  {verifiedSchool?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <div>
                <h2 className="text-2xl text-white mb-1">{nickname || verifiedSchool || '사용자'}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-gradient-to-r from-[#C0C0C0] to-[#E8E8E8] text-white border-0 font-semibold shadow-sm">
                    {levelIcon} {level} 레벨
                  </Badge>
                  <Badge className="bg-gradient-to-r from-lime-500/20 to-emerald-500/20 border-lime-500/50 text-lime-400 border px-3 py-1 font-semibold shadow-sm">
                    <span className="mr-1.5">🏫</span>
                    {verifiedSchool || '테스트학교'}
                  </Badge>
                </div>
              </div>
            </div>

            <Button variant="ghost" size="icon" className="text-white">
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          {/* Points and Rank */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-[#1DB954]" />
                <span className="text-sm text-muted-foreground">포인트</span>
              </div>
              <p className="text-3xl text-white">{userPoints}P</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-[#f97316]" />
                <span className="text-sm text-muted-foreground">랭킹</span>
              </div>
              <p className="text-3xl text-white">#{userRank}</p>
            </div>
          </div>

          {/* Progress to next level */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {nextLevelInfo.isMaxLevel ? "최고 레벨 달성!" : "다음 레벨까지"}
              </span>
              <span className="text-xs text-white">
                {nextLevelInfo.isMaxLevel ? "🎉" : `${nextLevelInfo.pointsRemaining}P 남음`}
              </span>
            </div>
            <Progress value={nextLevelInfo.progressPercent} className="h-2" />
            <div className="mt-1 text-xs text-muted-foreground text-center">
              전체 랭킹 기준
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={onRewardClick}
          className="h-auto py-4 flex-col gap-2 border-0 bg-gradient-to-br from-[#f97316] to-[#ef4444] hover:from-[#fb923c] hover:to-[#f87171] text-white"
        >
          <Gift className="w-6 h-6" />
          <span>보상 받기</span>
        </Button>
        <Button
          variant="outline"
          className={`h-auto py-4 flex-col gap-2 border-white/10 text-white ${hasCheckedInToday
            ? "bg-white/5 opacity-50 cursor-not-allowed"
            : "bg-gradient-to-br from-[#14b8a6]/10 to-[#3b82f6]/10 hover:from-[#14b8a6]/20 hover:to-[#3b82f6]/20"
            }`}
          onClick={handleDailyCheckIn}
          disabled={isCheckingIn || hasCheckedInToday}
        >
          {isCheckingIn ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Calendar className="w-6 h-6" />
          )}
          <span>{hasCheckedInToday ? "출석 완료" : "출석 체크"}</span>
          {!hasCheckedInToday && (
            <Badge variant="secondary" className="text-xs bg-[#14b8a6] text-black border-0">
              +5P
            </Badge>
          )}
        </Button>
      </div>

      {/* Stats */}
      <Card className="p-5 bg-card border-white/10">
        <h3 className="mb-4 flex items-center gap-2 text-white">
          <Award className="w-5 h-5 text-[#1DB954]" />
          활동 통계
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 rounded-lg p-3 border border-white/10"
            >
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl mb-1 text-white">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Daily Limits */}
      {dailyLimit && (
        <Card className="p-5 bg-card border-white/10">
          <h3 className="mb-4 flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-lime-500" />
            오늘의 포인트 획득 현황
          </h3>
          <div className="space-y-3">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-lime-400" />
                  <span className="text-sm text-white">투표 참여</span>
                </div>
                <Badge
                  variant="outline"
                  className={`border ${
                    dailyLimit.voteRemaining === 0
                      ? 'border-red-500/50 bg-red-500/10 text-red-400'
                      : dailyLimit.voteRemaining <= 3
                      ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                      : 'border-lime-500/50 bg-lime-500/10 text-lime-400'
                  }`}
                >
                  {dailyLimit.voteRemaining}/{dailyLimit.voteLimit}
                </Badge>
              </div>
              <Progress
                value={(dailyLimit.voteRemaining / dailyLimit.voteLimit) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {dailyLimit.voteRemaining > 0
                  ? `${dailyLimit.voteRemaining}회 더 포인트를 획득할 수 있어요 (+1P)`
                  : '오늘의 포인트 획득 한도를 모두 사용했어요'}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-white">투표 생성</span>
                </div>
                <Badge
                  variant="outline"
                  className={`border ${
                    dailyLimit.createRemaining === 0
                      ? 'border-red-500/50 bg-red-500/10 text-red-400'
                      : dailyLimit.createRemaining <= 2
                      ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                      : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  {dailyLimit.createRemaining}/{dailyLimit.createLimit}
                </Badge>
              </div>
              <Progress
                value={(dailyLimit.createRemaining / dailyLimit.createLimit) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {dailyLimit.createRemaining > 0
                  ? `${dailyLimit.createRemaining}회 더 포인트를 획득할 수 있어요 (+10P)`
                  : '오늘의 포인트 획득 한도를 모두 사용했어요'}
              </p>
            </div>

            <div className="bg-gradient-to-r from-lime-500/10 to-emerald-500/10 rounded-lg p-3 border border-lime-500/20">
              <p className="text-xs text-lime-400 text-center">
                💡 포인트 획득 횟수를 초과해도 투표 참여와 생성은 가능해요!
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Activities */}
      <Card className="p-5 bg-card border-white/10">
        <h3 className="mb-4 text-white">최근 활동</h3>
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : pointHistory.length > 0 ? (
            pointHistory.map((history, index) => (
              <div
                key={index}
                className="flex items-start gap-3 pb-3 border-b border-white/10 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-sm">
                  {getPointIcon(history.description)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-white">{history.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTimeAgo(history.timestamp)}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={`shrink-0 border-0 ${history.points > 0
                    ? "bg-[#1DB954]/20 text-[#1DB954]"
                    : "bg-red-500/20 text-red-500"
                    }`}
                >
                  {history.points > 0 ? "+" : ""}{history.points}P
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              아직 활동 내역이 없습니다.
            </div>
          )}
        </div>
      </Card>

      {/* My Coupons */}
      <Card className="p-5 bg-card border-white/10">
        <h3 className="mb-4 flex items-center gap-2 text-white">
          <Ticket className="w-5 h-5 text-[#f97316]" />
          내 쿠폰함
        </h3>
        <div className="space-y-3">
          {redeemedRewards.length > 0 ? (
            redeemedRewards.map((reward, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-[#f97316]/10 to-[#ef4444]/10 border border-[#f97316]/20"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#f97316] to-[#ef4444] flex items-center justify-center shrink-0">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{reward.description.replace('리워드 교환: ', '')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTimeAgo(reward.timestamp)}
                  </p>
                </div>
                <Badge className="bg-[#f97316]/20 text-[#f97316] border-0 shrink-0">
                  {Math.abs(reward.points)}P
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>아직 교환한 리워드가 없습니다.</p>
              <p className="text-xs mt-1">포인트를 모아 리워드를 교환해보세요!</p>
            </div>
          )}
        </div>
      </Card>

      {/* Achievements */}
      <Card className="p-5 bg-card border-white/10">
        <h3 className="mb-4 text-white">업적</h3>
        <div className="grid grid-cols-2 gap-3">
          {achievements.map((achievement, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border text-center transition-all ${achievement.unlocked
                ? "border-[#1DB954]/30 bg-[#1DB954]/10"
                : "border-white/10 bg-white/5 opacity-50"
                }`}
            >
              <div
                className={`text-3xl mb-2 ${!achievement.unlocked && "grayscale"
                  }`}
              >
                {achievement.emoji}
              </div>
              <p className="text-xs text-white">{achievement.name}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Settings */}
      <Card className="p-4 bg-card border-white/10">
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-2 text-white hover:bg-white/5">
            <Settings className="w-4 h-4" />
            설정
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Button>
        </div>
      </Card>
    </div>
  );
}
