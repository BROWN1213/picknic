import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Trophy, TrendingUp, Award, Medal } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { rankingService } from "../services/rankingService";
import type { PersonalRankingResponse, SchoolRankingResponse } from "../types/ranking";

interface RankingBoardProps {
  userPoints: number;
  userRank: number;
  level?: string;
  levelIcon?: string;
}

export function RankingBoard({ userPoints, userRank, level = "실버", levelIcon = "🥈" }: RankingBoardProps) {
  const [personalRanking, setPersonalRanking] = useState<PersonalRankingResponse | null>(null);
  const [schoolRanking, setSchoolRanking] = useState<SchoolRankingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"personal" | "school">("personal");

  useEffect(() => {
    const loadRankings = async () => {
      setIsLoading(true);
      try {
        const [personal, school] = await Promise.all([
          rankingService.getPersonalRanking(20, 0),
          rankingService.getSchoolRanking(20, 0),
        ]);
        setPersonalRanking(personal);
        setSchoolRanking(school);
      } catch (error) {
        console.error('Failed to load rankings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRankings();
  }, []);

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-[#1DB954] text-black";
    if (rank === 2) return "bg-white/20 text-white";
    if (rank === 3) return "bg-orange-500/80 text-white";
    return "bg-white/10 text-muted-foreground";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5" />;
    if (rank === 2) return <Medal className="w-5 h-5" />;
    if (rank === 3) return <Award className="w-5 h-5" />;
    return <span>{rank}</span>;
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
      {/* User Stats */}
      <Card className="p-6 bg-gradient-to-br from-[#8b5cf6] via-[#ec4899] to-[#f97316] text-white border-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <p className="text-white/80 text-sm">
              {activeTab === "personal" ? "내 랭킹 (개인)" : "내 학교 랭킹"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {activeTab === "personal" ? (
                <>
                  <span className="text-4xl">#{userRank}</span>
                  <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">{levelIcon} {level}</Badge>
                </>
              ) : (
                <>
                  <span className="text-4xl">
                    #{schoolRanking?.mySchool?.rank || "-"}
                  </span>
                  <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                    🏫 {schoolRanking?.mySchool?.schoolName || "미인증"}
                  </Badge>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm">
              {activeTab === "personal" ? "보유 포인트" : "학교 총점"}
            </p>
            <div className="text-3xl mt-1">
              {activeTab === "personal"
                ? `${userPoints}P`
                : `${schoolRanking?.mySchool?.totalPoints?.toLocaleString() || 0}P`
              }
            </div>
          </div>
        </div>

        <div className="space-y-2 relative z-10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/80">
              {activeTab === "personal"
                ? (nextLevelInfo.isMaxLevel ? "최고 레벨 달성!" : "다음 등급까지")
                : "1위와의 격차"
              }
            </span>
            <span className="text-white">
              {activeTab === "personal"
                ? (nextLevelInfo.isMaxLevel ? "🎉" : `${nextLevelInfo.pointsRemaining}P 남음`)
                : schoolRanking?.topSchools?.[0] && schoolRanking?.mySchool
                  ? `${(schoolRanking.topSchools[0].totalPoints - schoolRanking.mySchool.totalPoints).toLocaleString()}P`
                  : "-"
              }
            </span>
          </div>
          <Progress
            value={activeTab === "personal" ? nextLevelInfo.progressPercent :
              (schoolRanking?.mySchool && schoolRanking?.topSchools?.[0]
                ? (schoolRanking.mySchool.totalPoints / schoolRanking.topSchools[0].totalPoints) * 100
                : 0)
            }
            className="h-2 bg-white/20"
          />
        </div>
      </Card>

      {/* Rankings Tabs */}
      <Tabs defaultValue="personal" className="w-full" onValueChange={(value) => setActiveTab(value as "personal" | "school")}>
        <TabsList className="grid w-full grid-cols-2 bg-card border border-white/10">
          <TabsTrigger value="personal" className="gap-2 data-[state=active]:bg-[#1DB954] data-[state=active]:text-black">
            <TrendingUp className="w-4 h-4" />
            개인 랭킹
          </TabsTrigger>
          <TabsTrigger value="school" className="gap-2 data-[state=active]:bg-[#1DB954] data-[state=active]:text-black">
            <Trophy className="w-4 h-4" />
            학교 랭킹
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-2 mt-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">로딩 중...</div>
          ) : personalRanking ? (
            personalRanking.topRankers.map((user) => (
              <Card
                key={user.userId}
                className="p-4 transition-all border-white/10 bg-card hover:bg-[#1f1f1f]"
              >
                <div className="flex items-center gap-4">
                  <Badge
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getRankBadgeColor(
                      user.rank
                    )}`}
                  >
                    {getRankIcon(user.rank)}
                  </Badge>

                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-white/10 text-white">
                      {user.username.substring(0, 1)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white">{user.username}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {user.points.toLocaleString()}P
                      </span>
                    </div>
                  </div>

                  {user.rank <= 3 && (
                    <div className="text-2xl">
                      {user.rank === 1 ? "🏆" : user.rank === 2 ? "🥈" : "🥉"}
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">랭킹 데이터를 불러올 수 없습니다.</div>
          )}
        </TabsContent>

        <TabsContent value="school" className="space-y-2 mt-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">로딩 중...</div>
          ) : schoolRanking ? (
            <>
              {schoolRanking.topSchools.map((school) => {
                const isMySchool = school.schoolName === schoolRanking.mySchool?.schoolName;
                
                return (
                  <Card 
                    key={school.schoolName} 
                    className={`p-4 transition-all ${
                      isMySchool 
                        ? "bg-[#1DB954]/10 border-[#1DB954] border hover:bg-[#1DB954]/20" 
                        : "bg-card border-white/10 hover:bg-[#1f1f1f]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Badge
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getRankBadgeColor(
                          school.rank
                        )}`}
                      >
                        {getRankIcon(school.rank)}
                      </Badge>

                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-br from-[#1DB954] to-[#1aa34a] text-black">
                          {school.schoolName.substring(0, 1)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isMySchool ? "text-[#1DB954]" : "text-white"}`}>
                            {school.schoolName}
                          </span>
                          {isMySchool && (
                            <Badge className="bg-[#1DB954] text-black text-[10px] h-5 px-2 hover:bg-[#1DB954]">
                              내 학교
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          {school.memberCount && <span>👥 {school.memberCount}명</span>}
                          <span>• {school.totalPoints.toLocaleString()}P</span>
                        </div>
                      </div>

                      {school.rank === 1 && (
                        <Badge className="bg-[#1DB954] text-black border-0">
                          🔥 1위
                        </Badge>
                      )}
                    </div>
                  </Card>
                );
              })}
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">학교 랭킹 데이터를 불러올 수 없습니다.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
