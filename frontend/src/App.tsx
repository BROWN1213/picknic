import { useState, useRef, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import {
  Flame,
  School,
  Trophy,
  User,
  Plus,
  Zap,
  Search,
  Menu,
  Vote,
  Heart,
  Compass,
  Filter,
  X,
  Loader2,
} from "lucide-react";
import { VotingCard, type Vote as VoteType } from "./components/VotingCard";
import { VoteAnalysisModal } from "./components/VoteAnalysisModal";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { CreateVoteModal, type CreateVoteData } from "./components/CreateVoteModal";
import { RankingBoard } from "./components/RankingBoard";
import { ProfileSection } from "./components/ProfileSection";
import { RewardModal } from "./components/RewardModal";
import { MyVotesSheet } from "./components/MyVotesSheet";
import { NotificationPopover } from "./components/NotificationPopover";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { userService } from "./services/userService";
import { voteService } from "./services/voteService";
import { pointService } from "./services/pointService";
import { notificationService, type NotificationDisplay } from "./services/notificationService";
import { apiClient } from "./lib/api";
import type { UserProfile } from "./types/user";
import type { DailyLimitResponse } from "./types/point";

// Helper function removed as voteService now returns formatted data

export default function App() {
  const auth = useAuth();
  const [authStep, setAuthStep] = useState<"LOGIN" | "SIGNUP" | "APP">("LOGIN");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [signupData, setSignupData] = useState<{ email: string, providerId: string } | null>(null);
  const [verifiedSchool, setVerifiedSchool] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("hot");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPoints, setUserPoints] = useState(1750);
  const [userRank, setUserRank] = useState(6);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [isMyVotesSheetOpen, setIsMyVotesSheetOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSchool, setFilterSchool] = useState<boolean>(false);
  const [filterMyVotes, setFilterMyVotes] = useState<boolean>(false);
  const [filterParticipatedVotes, setFilterParticipatedVotes] = useState<boolean>(false);
  const [allVotesData, setAllVotesData] = useState<VoteType[]>([]);
  const voteRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [dailyLimit, setDailyLimit] = useState<DailyLimitResponse>({
    voteRemaining: 10,
    createRemaining: 5,
    voteLimit: 10,
    createLimit: 5
  });

  // API 클라이언트에 토큰 제공자 설정
  useEffect(() => {
    apiClient.setTokenProvider(() => {
      // OAuth 사용자: Cognito ID 토큰
      const oauthToken = auth.user?.id_token;
      if (oauthToken) {
        return oauthToken;
      }
      // LOCAL 사용자: localStorage의 커스텀 JWT 토큰
      return localStorage.getItem("token");
    });
  }, [auth.user]);



  // Load user profile and votes on mount
  useEffect(() => {
    loadInitialData();
  }, [authStep]);

  // Load notifications with polling
  useEffect(() => {
    const loadNotifications = async () => {
      if (authStep !== "APP") return;

      try {
        const data = await notificationService.getNotifications();
        setNotifications(data);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    if (authStep === "APP") {
      // Initial load
      loadNotifications();

      // Poll every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [authStep]);

  const loadInitialData = async () => {
    if (authStep !== "APP") return;

    setIsLoadingData(true);
    try {
      // OPTIMIZATION: Load all data in parallel instead of sequentially
      const [profile, votes, limit] = await Promise.all([
        userService.getMyProfile(),
        voteService.getVotes(), // 모든 투표 가져오기 (마감된 투표도 포함)
        pointService.getDailyLimit()
      ]);

      // Update all states
      setUserProfile(profile);
      setUserPoints(profile.points);
      setUserRank(profile.rank);
      setVerifiedSchool(profile.verifiedSchool);
      setAllVotesData(votes as unknown as VoteType[]);
      setDailyLimit(limit);
    } catch (error: any) {
      console.error('Failed to load initial data:', error);

      // User-friendly error messages
      if (error.isTimeout) {
        toast.error('데이터 로딩 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error('데이터를 불러오는데 실패했습니다. 페이지를 새로고침해주세요.');
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  // 알림 상태
  const [notifications, setNotifications] = useState<NotificationDisplay[]>([]);

  const handleNotificationClick = (voteId: string) => {
    // 전체 탭으로 이동
    setActiveTab("all");

    // 약간의 지연 후 스크롤 (탭 전환 애니메이션 고려)
    setTimeout(() => {
      const element = voteRefs.current[voteId];
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // 하이라이트 효과
        element.classList.add("ring-2", "ring-lime-500", "ring-offset-2", "ring-offset-background");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-lime-500", "ring-offset-2", "ring-offset-background");
        }, 2000);
      }
    }, 300);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setAuthStep("APP");
  };

  const handleNeedRegister = (email: string, providerId: string) => {
    setSignupData({ email, providerId });
    setAuthStep("SIGNUP");
  };

  const handleSignupSuccess = (user: any) => {
    if (signupData?.providerId && signupData.providerId !== "local") {
      // OAuth user - directly log in (already has valid token)
      setCurrentUser(user);
      setAuthStep("APP");
      setSignupData(null);
      toast.success("프로필 설정이 완료되었습니다! 환영합니다.");
    } else {
      // Local user - redirect to login page
      setAuthStep("LOGIN");
      setCurrentUser(null);
      setSignupData(null);
      toast.success("회원가입이 완료되었습니다! 로그인해주세요.");
    }
  };

  const handleBackToLogin = () => {
    setAuthStep("LOGIN");
    setSignupData(null);
  };

  // OAuth callback 처리 중 로딩 화면 표시
  if (window.location.pathname === '/auth/callback' || (auth.isLoading && !auth.isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-lime-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
        </div>

        <div className="flex flex-col items-center relative z-10">
          {/* Logo */}
          <div className="mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 shadow-lg shadow-lime-500/30 animate-pulse flex items-center justify-center" style={{ animationDuration: '2s' }}>
              <Vote className="w-11 h-11 text-black" strokeWidth={2.5} />
            </div>
          </div>

          {/* Loading Spinner */}
          <div className="relative mb-6">
            <Loader2 className="w-16 h-16 animate-spin text-lime-500" />
            <div className="absolute inset-0 w-16 h-16 bg-lime-500/20 rounded-full blur-xl animate-pulse"></div>
          </div>

          {/* Loading Text */}
          <div className="space-y-2 mb-4 text-center">
            <p className="text-white text-2xl font-bold">인증 처리중...</p>
            <p className="text-white/50 text-base">잠시만 기다려주세요</p>
          </div>

          {/* Loading Dots Animation */}
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-lime-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 rounded-full bg-lime-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 rounded-full bg-lime-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (authStep === "LOGIN") {
    return (
      <>
        <Toaster position="top-center" />
        <LoginPage onLoginSuccess={handleLoginSuccess} onNeedRegister={handleNeedRegister} />
      </>
    );
  }

  if (authStep === "SIGNUP" && signupData) {
    return (
      <>
        <Toaster position="top-center" />
        <SignupPage
          email={signupData.email}
          providerId={signupData.providerId}
          onSignupSuccess={handleSignupSuccess}
          onBackToLogin={handleBackToLogin}
        />
      </>
    );
  }

  // Computed values based on loaded data
  const hotVotes = allVotesData.filter(vote => vote.isHot).slice(0, 10);
  const schoolVotes = allVotesData.filter(vote => vote.schoolName);
  const allVotes = allVotesData;

  const refreshUserData = async () => {
    if (!auth.isAuthenticated && !localStorage.getItem("token")) return;
    
    try {
      const [profile, limit] = await Promise.all([
        userService.getMyProfile(),
        pointService.getDailyLimit()
      ]);

      setUserProfile(profile);
      setUserPoints(profile.points);
      setUserRank(profile.rank);
      setDailyLimit(limit);
      return { profile, limit };
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const handleVote = async (voteId: string, optionId: string) => {
    try {
      const oldRemaining = dailyLimit.voteRemaining;

      // Call API to cast vote
      const updatedVote = await voteService.castVote(Number(voteId), { optionId });

      // Update local state
      setAllVotesData(prevVotes =>
        prevVotes.map(vote =>
          vote.id === voteId ? (updatedVote as unknown as VoteType) : vote
        )
      );

      // Refresh user profile and daily limit
      const data = await refreshUserData();
      const limit = data?.limit || dailyLimit;

      // Show appropriate toast based on remaining count
      if (oldRemaining > 0) {
        toast.success(`투표 완료! +1 포인트 (남은 횟수: ${limit.voteRemaining}/${limit.voteLimit})`);
      } else {
        toast.info(`투표 완료! (오늘의 포인트 획득 한도 초과)`);
      }
    } catch (error) {
      console.error('Failed to cast vote:', error);
      toast.error('투표에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleViewStats = (vote: VoteType) => {
    setSelectedVote(vote);
    setIsAnalysisModalOpen(true);
  };

  const handleCreateVote = async (voteData: CreateVoteData) => {
    try {
      const oldRemaining = dailyLimit.createRemaining;

      // Call API to create vote
      const newVote = await voteService.createVote({
        type: voteData.type as 'balance' | 'multiple' | 'ox',
        title: voteData.title,
        description: voteData.description,
        imageUrl: voteData.imageUrl, // S3 이미지 URL 추가
        options: voteData.options.map(opt => ({
          text: opt.text || '',
          emoji: opt.emoji,
          image: opt.image
        })),
        category: voteData.category,
      });

      // Update local state
      setAllVotesData(prev => [(newVote as unknown as VoteType), ...prev]);

      // Refresh user profile and daily limit
      const data = await refreshUserData();
      const limit = data?.limit || dailyLimit;

      // Show appropriate toast based on remaining count
      if (oldRemaining > 0) {
        toast.success(`투표 생성 완료! +10 포인트 (남은 횟수: ${limit.createRemaining}/${limit.createLimit})`);
      } else {
        toast.info(`투표 생성 완료! (오늘의 포인트 획득 한도를 초과했습니다)`);
      }

      // Close modal
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create vote:', error);
      toast.error('투표 생성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleDeleteVote = async (voteId: string) => {
    try {
      await voteService.deleteVote(Number(voteId));

      // Remove from local state
      setAllVotesData(prev => prev.filter(vote => vote.id !== voteId));

      toast.success("투표가 삭제되었습니다.");
    } catch (error) {
      console.error('Failed to delete vote:', error);
      toast.error('투표 삭제에 실패했습니다.');
    }
  };

  const handleHotToggle = async (voteId: string, updatedVote: VoteType) => {
    // Update local state with the updated vote from API response
    setAllVotesData(prev =>
      prev.map(vote =>
        vote.id === voteId ? updatedVote : vote
      )
    );
  };

  const navItems = [
    { id: "hot", icon: Flame, label: "HOT" },
    { id: "all", icon: Compass, label: "전체" },
    { id: "ranking", icon: Trophy, label: "랭킹" },
    { id: "profile", icon: User, label: "프로필" },
  ];

  const handleLogout = async () => {
    // Clear user state first
    setCurrentUser(null);
    setUserProfile(null);
    setVerifiedSchool(null);
    setActiveTab("hot");
    setAllVotesData([]);
    setNotifications([]);

    // LOCAL 사용자용
    localStorage.removeItem("token");

    // OAuth 사용자용 (로컬 로그아웃만 수행, Cognito redirect 제거)
    if (auth.isAuthenticated) {
      try {
        await auth.removeUser(); // Clear local OAuth context
      } catch (error) {
        console.error("Error during OAuth logout:", error);
      }
    }

    // Clear all session storage to remove OIDC tokens and state
    sessionStorage.clear();

    // Reset auth step to trigger re-render
    setAuthStep("LOGIN");

    toast.success("로그아웃 되었습니다. 안전하게 로그아웃되었어요! 👋");
  };



  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="top-center" />

      {/* Fixed Hamburger Menu & Logo - Desktop (Always in same position) */}
      <div className="hidden lg:block fixed top-6 left-6 z-50">
        <div className="flex items-center gap-3">
          {/* Hamburger Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="text-muted-foreground hover:text-white hover:bg-white/5 p-2 rounded-lg transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* App Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-lime-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
              <Vote className="w-6 h-6 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl text-white leading-none whitespace-nowrap">Picknic</h1>
              <p className="text-xs text-muted-foreground leading-none mt-0.5 whitespace-nowrap">
                친구들과 함께 Pick!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Spotify-style Layout */}
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className={`hidden lg:flex flex-col transition-all duration-300 ${isSidebarCollapsed
          ? 'w-20 bg-transparent'
          : 'w-64 bg-black border-r border-white/10'
          } ${isSidebarCollapsed ? 'p-4 pt-28' : 'p-6 pt-28'}`}>

          {/* Navigation */}
          <nav className="space-y-2 mb-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex ${isSidebarCollapsed ? 'flex-col items-center gap-1 py-3 px-2' : 'flex-row items-center gap-4 py-3 px-4'} rounded-lg transition-all ${activeTab === item.id
                  ? isSidebarCollapsed
                    ? "bg-background text-lime-500"
                    : "bg-gradient-to-r from-lime-500/20 to-emerald-500/20 text-lime-500 border border-lime-500/30"
                  : isSidebarCollapsed
                    ? "text-muted-foreground hover:text-white hover:bg-background"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
              >
                <item.icon className="w-5 h-5" />
                {isSidebarCollapsed ? (
                  <span className="text-[10px] leading-none">{item.label}</span>
                ) : (
                  <span>{item.label}</span>
                )}
              </button>
            ))}

            {/* Create Vote Button in Sidebar */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className={`w-full flex ${isSidebarCollapsed ? 'flex-col items-center gap-1 py-3 px-2' : 'flex-row items-center gap-4 py-3 px-4'} rounded-lg transition-all bg-gradient-to-r from-lime-500 to-emerald-500 text-black hover:from-lime-600 hover:to-emerald-600 hover:scale-105 mt-4`}
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              {isSidebarCollapsed ? (
                <span className="text-[10px] leading-none">만들기</span>
              ) : (
                <span>투표 만들기</span>
              )}
            </button>
          </nav>

          {/* Points Card or Icon */}
          <div className="mt-auto">
            {isSidebarCollapsed ? (
              <button
                onClick={() => setIsRewardModalOpen(true)}
                className="w-full aspect-square rounded-lg bg-gradient-to-br from-orange-500 via-pink-500 to-rose-500 flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                title={`${userPoints}P`}
              >
                <Zap className="w-6 h-6 text-white" />
              </button>
            ) : (
              <div className="bg-gradient-to-br from-orange-500 via-pink-500 to-rose-500 rounded-lg p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10" />
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <span className="text-sm text-white/90">보유 포인트</span>
                  <Zap className="w-4 h-4 text-white/90" />
                </div>
                <div className="text-2xl text-white mb-2 relative z-10">{userPoints}P</div>
                <Button
                  size="sm"
                  onClick={() => setIsRewardModalOpen(true)}
                  className="w-full bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm relative z-10"
                >
                  보상 받기
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="bg-[#0f1419]/95 backdrop-blur-lg border-b border-white/10 px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile Logo */}
                <div className="lg:hidden flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lime-500 to-emerald-500 flex items-center justify-center">
                    <Vote className="w-5 h-5 text-black" strokeWidth={2.5} />
                  </div>
                  <span className="text-xl text-white">Picknic</span>
                </div>

                {/* Search - Desktop (with proper spacing for logo) */}
                <div className={`hidden md:flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 w-80 transition-all duration-300 ${isSidebarCollapsed ? 'ml-32' : ''
                  }`}>
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="투표 검색..."
                    className="bg-transparent border-0 outline-none text-sm text-white placeholder:text-muted-foreground w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile Search Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-white hover:bg-white/10"
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search className="w-5 h-5" />
                </Button>

                {/* Daily Limit Badges */}
                <div className="hidden lg:flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`gap-1 border ${
                      dailyLimit.voteRemaining === 0
                        ? 'border-red-500/50 bg-red-500/10 text-red-400'
                        : dailyLimit.voteRemaining <= 3
                        ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                        : 'border-lime-500/50 bg-lime-500/10 text-lime-400'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    <span className="text-xs">투표 {dailyLimit.voteRemaining}/{dailyLimit.voteLimit}</span>
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`gap-1 border ${
                      dailyLimit.createRemaining === 0
                        ? 'border-red-500/50 bg-red-500/10 text-red-400'
                        : dailyLimit.createRemaining <= 2
                        ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                        : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span className="text-xs">생성 {dailyLimit.createRemaining}/{dailyLimit.createLimit}</span>
                  </Badge>
                </div>

                {/* Notification Popover */}
                <NotificationPopover
                  notifications={notifications}
                  onNotificationClick={handleNotificationClick}
                  onMarkAsRead={handleMarkAsRead}
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-white hover:bg-white/10"
                  onClick={() => setIsMyVotesSheetOpen(true)}
                >
                  <Heart className="w-5 h-5" />
                </Button>

                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="gap-2 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-black border-0 hidden lg:flex"
                >
                  <Plus className="w-4 h-4" />
                  <span>투표 만들기</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 lg:px-8 py-6 pb-32 lg:pb-6">
              {/* Loading State */}
              {isLoadingData ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                  <Loader2 className="w-12 h-12 text-lime-500 animate-spin" />
                  <div className="text-center space-y-2">
                    <p className="text-white text-lg font-medium">데이터를 불러오는 중...</p>
                    <p className="text-white/40 text-sm">잠시만 기다려주세요</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* HOT Feed */}
                  {activeTab === "hot" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl text-white mb-2">🔥 실시간 HOT 투표</h2>
                    <p className="text-muted-foreground">
                      지금 가장 뜨거운 투표들
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {hotVotes.map((vote) => (
                      <VotingCard
                        key={vote.id}
                        vote={vote}
                        onVote={handleVote}
                        onViewStats={handleViewStats}
                        onDelete={handleDeleteVote}
                        onHotToggle={handleHotToggle}
                        currentUserId={userProfile?.userId}
                        isSystemAccount={userProfile?.isSystemAccount}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Feed with Filters */}
              {activeTab === "all" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl text-white mb-2">전체 투표</h2>
                    <p className="text-muted-foreground">
                      모든 투표를 한눈에 확인하세요
                    </p>
                  </div>

                  {/* Filters */}
                  <div className="space-y-4">
                    {/* School Toggle and My Votes */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setFilterSchool(!filterSchool)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${filterSchool
                          ? "border-lime-500 bg-lime-500/10 text-lime-500"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:border-lime-500/50"
                          }`}
                      >
                        <School className="w-4 h-4" />
                        <span className="text-sm">우리학교만 보기</span>
                      </button>
                      <button
                        onClick={() => setFilterMyVotes(!filterMyVotes)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${filterMyVotes
                          ? "border-lime-500 bg-lime-500/10 text-lime-500"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:border-lime-500/50"
                          }`}
                      >
                        <User className="w-4 h-4" />
                        <span className="text-sm">내가 만든 투표</span>
                      </button>
                      <button
                        onClick={() => setFilterParticipatedVotes(!filterParticipatedVotes)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${filterParticipatedVotes
                          ? "border-lime-500 bg-lime-500/10 text-lime-500"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:border-lime-500/50"
                          }`}
                      >
                        <Zap className="w-4 h-4" />
                        <span className="text-sm">참여한 투표 숨기기</span>
                      </button>
                    </div>

                    {/* Type Filter */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">투표 타입</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setFilterType("all")}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${filterType === "all"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <Compass className="w-4 h-4" />
                          <span className="text-sm">전체</span>
                        </button>
                        <button
                          onClick={() => setFilterType("balance")}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${filterType === "balance"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-lg">⚖️</span>
                          <span className="text-sm">밸런스 게임</span>
                        </button>
                        <button
                          onClick={() => setFilterType("multiple")}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${filterType === "multiple"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-lg">📝</span>
                          <span className="text-sm">객관식</span>
                        </button>
                        <button
                          onClick={() => setFilterType("ox")}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${filterType === "ox"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-lg">⭕</span>
                          <span className="text-sm">O/X</span>
                        </button>
                      </div>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">카테고리</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setFilterCategory("all")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filterCategory === "all"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-base">🌟</span>
                          <span className="text-sm">전체</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("일상")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filterCategory === "일상"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-base">☀️</span>
                          <span className="text-sm">일상</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("음식")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filterCategory === "음식"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-base">🍕</span>
                          <span className="text-sm">음식</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("패션")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filterCategory === "패션"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-base">👕</span>
                          <span className="text-sm">패션</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("게임")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filterCategory === "게임"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-base">🎮</span>
                          <span className="text-sm">게임</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("학교")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filterCategory === "학교"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-base">🏫</span>
                          <span className="text-sm">학교</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("아이돌")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filterCategory === "아이돌"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-base">⭐</span>
                          <span className="text-sm">아이돌</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("영화/드라마")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filterCategory === "영화/드라마"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-base">🎬</span>
                          <span className="text-sm">영화/드라마</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("운동")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filterCategory === "운동"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-base">⚽</span>
                          <span className="text-sm">운동</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("취미")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filterCategory === "취미"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-base">🎨</span>
                          <span className="text-sm">취미</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("밈/유머")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filterCategory === "밈/유머"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-base">😂</span>
                          <span className="text-sm">밈/유머</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("환경")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filterCategory === "환경"
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                            }`}
                        >
                          <span className="text-base">🌱</span>
                          <span className="text-sm">환경</span>
                        </button>
                      </div>
                    </div>

                    {/* Reset Filters */}
                    {(filterType !== "all" || filterCategory !== "all" || filterSchool || filterMyVotes || filterParticipatedVotes) && (
                      <button
                        onClick={() => {
                          setFilterType("all");
                          setFilterCategory("all");
                          setFilterSchool(false);
                          setFilterMyVotes(false);
                          setFilterParticipatedVotes(false);
                        }}
                        className="text-sm text-lime-500 hover:text-lime-400 transition-colors flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        필터 초기화
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {allVotes
                      .filter((vote) => {
                        const typeMatch = filterType === "all" || vote.type === filterType;
                        const categoryMatch = filterCategory === "all" || vote.category === filterCategory;
                        const schoolMatch = !filterSchool || (vote.schoolName && userProfile?.verifiedSchool && vote.schoolName === userProfile.verifiedSchool);
                        const myVoteMatch = !filterMyVotes || (userProfile?.userId && vote.creatorId === userProfile.userId);
                        const participatedMatch = !filterParticipatedVotes || vote.userVoted === null;
                        return typeMatch && categoryMatch && schoolMatch && myVoteMatch && participatedMatch;
                      })
                      .map((vote) => (
                        <div
                          key={vote.id}
                          ref={(el) => {
                            voteRefs.current[vote.id] = el;
                          }}
                          className="transition-all duration-300"
                        >
                          <VotingCard
                            vote={vote}
                            onVote={handleVote}
                            onViewStats={handleViewStats}
                            onDelete={handleDeleteVote}
                            onHotToggle={handleHotToggle}
                            currentUserId={userProfile?.userId}
                            isSystemAccount={userProfile?.isSystemAccount}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}



              {/* Ranking */}
              {activeTab === "ranking" && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-3xl text-white mb-2">랭킹</h2>
                    <p className="text-muted-foreground">
                      최고의 투표러들을 만나보세요
                    </p>
                  </div>
                  <RankingBoard
                    userPoints={userPoints}
                    userRank={userRank}
                    level={userProfile?.level}
                    levelIcon={userProfile?.levelIcon}
                  />
                </div>
              )}

              {/* Profile */}
              {activeTab === "profile" && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-3xl text-white mb-2">내 프로필</h2>
                    <p className="text-muted-foreground">
                      활동 내역과 통계를 확인하세요
                    </p>
                  </div>
                  <ProfileSection
                    userPoints={userPoints}
                    userRank={userRank}
                    verifiedSchool={verifiedSchool}
                    nickname={userProfile?.username}
                    level={userProfile?.level}
                    levelIcon={userProfile?.levelIcon}
                    onRewardClick={() => setIsRewardModalOpen(true)}
                    onLogout={handleLogout}
                    dailyLimit={dailyLimit}
                    onProfileUpdate={refreshUserData}
                  />
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </main>

        {/* Floating Action Button - Desktop */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="hidden lg:flex fixed bottom-8 right-8 w-16 h-16 rounded-full bg-gradient-to-br from-lime-500 to-emerald-500 shadow-2xl hover:shadow-lime-500/50 items-center justify-center hover:scale-110 transition-all z-40 group"
        >
          <Plus className="w-8 h-8 text-black group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
        </button>
      </div>

      {/* Vote Analysis Modal */}
      <VoteAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        vote={selectedVote}
      />
      {/* Bottom Navigation Bar - Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0f1419] border-t border-white/10 z-50">
        <div className="grid grid-cols-5 items-center h-20">
          {navItems.slice(0, 2).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 h-full transition-all ${activeTab === item.id
                ? "text-lime-500"
                : "text-muted-foreground"
                }`}
            >
              <item.icon className={`w-6 h-6 ${activeTab === item.id ? "scale-110" : ""} transition-transform`} />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex flex-col items-center justify-center gap-1 h-full text-lime-500 transition-all hover:scale-110"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-lime-500 to-emerald-500 flex items-center justify-center -mt-6 shadow-lg border-4 border-[#0f1419]">
              <Plus className="w-6 h-6 text-black" />
            </div>
            <span className="text-xs mt-1">만들기</span>
          </button>
          {navItems.slice(2, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 h-full transition-all ${activeTab === item.id
                ? "text-lime-500"
                : "text-muted-foreground"
                }`}
            >
              <item.icon className={`w-6 h-6 ${activeTab === item.id ? "scale-110" : ""} transition-transform`} />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}


      <CreateVoteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateVote={handleCreateVote}
      />

      <RewardModal
        isOpen={isRewardModalOpen}
        onClose={() => setIsRewardModalOpen(false)}
        userPoints={userPoints}
        onPointsUpdate={refreshUserData}
      />

      <MyVotesSheet
        isOpen={isMyVotesSheetOpen}
        onClose={() => setIsMyVotesSheetOpen(false)}
        onVoteClick={handleViewStats}
      />

      {/* Mobile Search Sheet */}
      {
        isSearchOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 lg:hidden">
            <div className="fixed inset-x-0 top-0 h-full bg-background border-t border-white/10 animate-in slide-in-from-bottom duration-300">
              <div className="flex flex-col h-full">
                {/* Search Header */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="text-white hover:bg-white/10 p-2 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="투표 검색..."
                      className="bg-transparent border-0 outline-none text-sm text-white placeholder:text-muted-foreground w-full"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Search Results */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">최근 검색</p>
                    <div className="space-y-2">
                      {['밸런스 게임', '학교 투표', 'MBTI'].map((term) => (
                        <button
                          key={term}
                          className="w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <span>{term}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}
