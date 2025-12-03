import { useState, useRef, useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
  Heart,
  Compass,
  Filter,
  X,
} from "lucide-react";
import { VotingCard, type Vote as VoteType } from "./components/VotingCard";
import { StatsModal } from "./components/StatsModal";
import { CreateVoteModal, type CreateVoteData } from "./components/CreateVoteModal";
import { RankingBoard } from "./components/RankingBoard";
import { ProfileSection } from "./components/ProfileSection";
import { RewardModal } from "./components/RewardModal";
import { LoginScreen } from "./components/LoginScreen";
import { StudentIdVerification } from "./components/StudentIdVerification";
import { MyVotesSheet } from "./components/MyVotesSheet";
import { NotificationPopover } from "./components/NotificationPopover";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

export default function App() {
  const [authStep, setAuthStep] = useState<"login" | "school-verify" | "main">("login");
  const [verifiedSchool, setVerifiedSchool] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("hot");
  const [userPoints, setUserPoints] = useState(1750);
  const [userRank, setUserRank] = useState(6);
  const [selectedVote, setSelectedVote] = useState<Vote | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [isMyVotesSheetOpen, setIsMyVotesSheetOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSchool, setFilterSchool] = useState<boolean>(false);
  const [filterMyVotes, setFilterMyVotes] = useState<boolean>(false);
  const [createdVotes, setCreatedVotes] = useState<Vote[]>([]);
  const voteRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // 백엔드 Health Check (14분마다 실행)
  useEffect(() => {
    const healthCheck = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
        await fetch(`${baseUrl}/health`);
        console.log('Health check sent');
      } catch (error) {
        console.error('Health check failed', error);
      }
    };

    healthCheck();
    const interval = setInterval(healthCheck, 14 * 60 * 1000); // 14분

    return () => clearInterval(interval);
  }, []);

  // 알림 상태
  const [notifications, setNotifications] = useState([
    {
      id: "notif-1",
      title: "🔥 학교 투표 참여 현황",
      message: "지금 우리 학교 학생 68%는 '겨울 교복보다 하복이 더 예쁘다'에 투표했어요!",
      time: "5분 전",
      voteId: "uniform-vote",
      isRead: false,
    },
  ]);

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

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  const [hotVotes, setHotVotes] = useState<Vote[]>([
    {
      id: "pineapple-pizza",
      type: "balance",
      title: "파인애플 피자 호 VS 불호",
      description: "영원한 논쟁! 당신의 선택은?",
      options: [
        { id: "pp-a", text: "호 (맛있다)", emoji: "🍍", votes: 1750 },
        { id: "pp-b", text: "불호 (말도 안돼)", emoji: "🚫", votes: 5250 },
      ],
      totalVotes: 7000,
      category: "음식",
      isHot: true,
      timeLeft: "5시간",
      points: 1,
    },
    {
      id: "uniform-freedom",
      type: "balance",
      title: "교복 자율화 찬성 vs 반대",
      description: "교복 자율화에 대한 여러분의 의견은?",
      options: [
        { id: "uf-a", text: "찬성", emoji: "👕", votes: 3844 },
        { id: "uf-b", text: "반대", emoji: "🎓", votes: 2356 },
      ],
      totalVotes: 6200,
      category: "학교",
      isHot: true,
      timeLeft: "1일",
      points: 2,
    },
    {
      id: "1",
      type: "balance",
      title: "평생 떡볶이만 먹기 vs 평생 햄버거만 먹기",
      options: [
        { id: "1a", text: "떡볶이", emoji: "🌶️", votes: 3240 },
        { id: "1b", text: "햄버거", emoji: "🍔", votes: 2880 },
      ],
      totalVotes: 6120,
      category: "음식",
      isHot: true,
      timeLeft: "2시간",
      points: 1,
    },
    {
      id: "2",
      type: "balance",
      title: "오늘 어떤 신발 신을까?",
      description: "친구들이 추천해주는 신발!",
      options: [
        {
          id: "2a",
          text: "화이트 스니커즈",
          emoji: "👟",
          image: "https://images.unsplash.com/photo-1578314921455-34dd4626b38d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMHNuZWFrZXJzJTIwc2hvZXN8ZW58MXx8fHwxNzYyMjc1NTQwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
          votes: 1450,
        },
        {
          id: "2b",
          text: "블랙 스니커즈",
          emoji: "🥾",
          image: "https://images.unsplash.com/photo-1574020462714-5451391cc336?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFjayUyMHNuZWFrZXJzJTIwc2hvZXN8ZW58MXx8fHwxNzYyMzE5MzExfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
          votes: 1120,
        },
      ],
      totalVotes: 2570,
      category: "패션",
      schoolName: "서울고등학교",
      isHot: true,
    },
    {
      id: "3",
      type: "balance",
      title: "이번 월즈 우승팀은?",
      description: "2025 롤드컵 우승 예측! 맞히면 +15 포인트!",
      options: [
        {
          id: "3a",
          text: "KT Rolster",
          emoji: "🏆",
          votes: 2350,
        },
        {
          id: "3b",
          text: "T1",
          emoji: "👑",
          votes: 3780,
        },
      ],
      totalVotes: 6130,
      category: "게임",
      isHot: true,
      timeLeft: "3일",
      points: 15,
    },
    {
      id: "4",
      type: "ox",
      title: "나만 밥 먹을 때 영상 봄?",
      options: [
        { id: "4a", text: "O", votes: 4230 },
        { id: "4b", text: "X", votes: 1890 },
      ],
      totalVotes: 6120,
      category: "일상",
    },
    {
      id: "5",
      type: "balance",
      title: "식칼 vs 몽둥이",
      description: "좀비 아포칼립스 생존 무기",
      options: [
        { id: "5a", text: "식칼", emoji: "🔪", votes: 2940 },
        { id: "5b", text: "몽둥이", emoji: "⚾", votes: 3180 },
      ],
      totalVotes: 6120,
      category: "밈/유머",
      isHot: true,
    },
  ]);

  const [allVotes, setAllVotes] = useState<Vote[]>([
    {
      id: "uniform-vote",
      type: "balance",
      title: "겨울 교복보다 하복이 더 예쁘다",
      description: "우리 학교 교복 중 더 예쁜 건?",
      options: [
        { id: "uv-a", text: "맞아, 하복이 더 예뻐", emoji: "👔", votes: 612 },
        { id: "uv-b", text: "무슨 소리 겨울 교복이 더 예쁘다", emoji: "🧥", votes: 288 },
      ],
      totalVotes: 900,
      category: "학교",
      schoolName: "서울고등학교",
      timeLeft: "6시간",
      points: 1,
    },
    {
      id: "env-cup",
      type: "balance",
      title: "물컵 VS 텀블러",
      description: "환경을 생각한다면?",
      options: [
        { id: "ec-a", text: "물컵", emoji: "🥤", votes: 1240 },
        { id: "ec-b", text: "텀블러", emoji: "🧋", votes: 3860 },
      ],
      totalVotes: 5100,
      category: "환경",
      timeLeft: "12시간",
      points: 1,
    },
    {
      id: "env-straw",
      type: "balance",
      title: "플라스틱 빨대 찬성 VS 반대",
      description: "편의 vs 환경, 당신의 선택은?",
      options: [
        { id: "es-a", text: "찬성 (편하긴 해)", emoji: "🥤", votes: 1820 },
        { id: "es-b", text: "반대 (환경이 중요)", emoji: "🌱", votes: 4580 },
      ],
      totalVotes: 6400,
      category: "환경",
      timeLeft: "8시간",
      points: 1,
    },
  ]);

  const [schoolVotes, setSchoolVotes] = useState<Vote[]>([
    {
      id: "7",
      type: "multiple",
      title: "점심 메뉴 투표",
      options: [
        { id: "7a", text: "김치찌개", emoji: "🍲", votes: 180 },
        { id: "7b", text: "돈까스", emoji: "🍱", votes: 240 },
        { id: "7c", text: "치킨", emoji: "🍗", votes: 320 },
        { id: "7d", text: "피자", emoji: "🍕", votes: 160 },
      ],
      totalVotes: 900,
      category: "음식",
      schoolName: "서울고등학교",
    },
    {
      id: "8",
      type: "ox",
      title: "오늘 체육시간 축구할래?",
      options: [
        { id: "8a", text: "O", votes: 420 },
        { id: "8b", text: "X", votes: 280 },
      ],
      totalVotes: 700,
      category: "학교",
      schoolName: "서울고등학교",
    },
    {
      id: "9",
      type: "balance",
      title: "야자 vs 아침자습",
      options: [
        { id: "9a", text: "야자", emoji: "🌙", votes: 380 },
        { id: "9b", text: "아침자습", emoji: "☀️", votes: 520 },
      ],
      totalVotes: 900,
      category: "학교",
      schoolName: "서울고등학교",
    },
  ]);

  const handleVote = (voteId: string, optionId: string) => {
    setHotVotes((prevVotes) =>
      prevVotes.map((vote) =>
        vote.id === voteId
          ? {
              ...vote,
              options: vote.options.map((opt) =>
                opt.id === optionId
                  ? { ...opt, votes: opt.votes + 1 }
                  : opt
              ),
              totalVotes: vote.totalVotes + 1,
              userVoted: optionId,
            }
          : vote
      )
    );

    setSchoolVotes((prevVotes) =>
      prevVotes.map((vote) =>
        vote.id === voteId
          ? {
              ...vote,
              options: vote.options.map((opt) =>
                opt.id === optionId
                  ? { ...opt, votes: opt.votes + 1 }
                  : opt
              ),
              totalVotes: vote.totalVotes + 1,
              userVoted: optionId,
            }
          : vote
      )
    );

    setAllVotes((prevVotes) =>
      prevVotes.map((vote) =>
        vote.id === voteId
          ? {
              ...vote,
              options: vote.options.map((opt) =>
                opt.id === optionId
                  ? { ...opt, votes: opt.votes + 1 }
                  : opt
              ),
              totalVotes: vote.totalVotes + 1,
              userVoted: optionId,
            }
          : vote
      )
    );

    setUserPoints((prev) => prev + 1);
    toast.success("투표 완료! +1 포인트");
  };

  const handleViewStats = (vote: Vote) => {
    setSelectedVote(vote);
    setIsStatsModalOpen(true);
  };

  const handleCreateVote = (voteData: CreateVoteData) => {
    const newVote: Vote = {
      ...voteData,
      id: Date.now().toString(),
      totalVotes: 0,
      schoolName: "서울고등학교",
    };

    setSchoolVotes([newVote, ...schoolVotes]);
    setCreatedVotes([newVote, ...createdVotes]);
    setUserPoints((prev) => prev + 2);
  };

  const navItems = [
    { id: "hot", icon: Flame, label: "HOT" },
    { id: "all", icon: Compass, label: "전체" },
    { id: "ranking", icon: Trophy, label: "랭킹" },
    { id: "profile", icon: User, label: "프로필" },
  ];

  const handleLogin = () => {
    setAuthStep("main");
    toast.success("로그인 성공! 환영합니다 🎉");
  };

  const handleLogout = () => {
    setAuthStep("login");
    setVerifiedSchool(null);
    setActiveTab("hot");
    toast.info("로그아웃 되었습니다");
  };

  const handleEmailSignup = () => {
    setAuthStep("school-verify");
  };

  const handleSocialLogin = () => {
    // 소셜 로그인 후 학생증 인증으로 이동
    setAuthStep("school-verify");
    setVerifiedSchool(null);
    toast.success("로그인 되었습니다!");
  };

  const handleSchoolVerificationComplete = (schoolName?: string) => {
    setAuthStep("main");
    if (schoolName) {
      setVerifiedSchool(schoolName);
      setUserPoints(prev => prev + 50); // 보너스 포인트
      toast.success(`${schoolName} 인증이 완료되었습니다! +50P 🎉`);
    } else {
      toast.success("Picknic에 오신 것을 환영합니다! 🎉");
    }
  };

  const handleSchoolVerificationSkip = () => {
    setAuthStep("main");
    setVerifiedSchool(null);
    toast.success("Picknic에 오신 것을 환영합니다! 🎉");
  };

  // Show login screen
  if (authStep === "login") {
    return (
      <>
        <Toaster position="top-center" />
        <LoginScreen 
          onEmailSignup={handleEmailSignup}
          onSocialLogin={handleSocialLogin}
        />
      </>
    );
  }

  // Show school verification screen
  if (authStep === "school-verify") {
    return (
      <>
        <Toaster position="top-center" />
        <StudentIdVerification 
          onComplete={handleSchoolVerificationComplete}
          onBack={() => setAuthStep("login")}
        />
      </>
    );
  }

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
        <aside className={`hidden lg:flex flex-col transition-all duration-300 ${
          isSidebarCollapsed 
            ? 'w-20 bg-transparent' 
            : 'w-64 bg-black border-r border-white/10'
        } ${isSidebarCollapsed ? 'p-4 pt-28' : 'p-6 pt-28'}`}>

          {/* Navigation */}
          <nav className="space-y-2 mb-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex ${isSidebarCollapsed ? 'flex-col items-center gap-1 py-3 px-2' : 'flex-row items-center gap-4 py-3 px-4'} rounded-lg transition-all ${
                  activeTab === item.id
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
                <div className={`hidden md:flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 w-80 transition-all duration-300 ${
                  isSidebarCollapsed ? 'ml-32' : ''
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
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xs border-0">
                    {[...hotVotes, ...schoolVotes, ...allVotes].filter(v => v.userVoted).length}
                  </Badge>
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
                    {[...hotVotes, ...schoolVotes]
                      .filter((vote) => vote.isHot)
                      .map((vote) => (
                        <VotingCard
                          key={vote.id}
                          vote={vote}
                          onVote={handleVote}
                          onViewStats={handleViewStats}
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFilterSchool(!filterSchool)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                          filterSchool
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-muted-foreground hover:border-lime-500/50"
                        }`}
                      >
                        <School className="w-4 h-4" />
                        <span className="text-sm">우리학교만 보기</span>
                      </button>
                      <button
                        onClick={() => setFilterMyVotes(!filterMyVotes)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                          filterMyVotes
                            ? "border-lime-500 bg-lime-500/10 text-lime-500"
                            : "border-white/10 bg-white/5 text-muted-foreground hover:border-lime-500/50"
                        }`}
                      >
                        <User className="w-4 h-4" />
                        <span className="text-sm">내가 만든 투표</span>
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
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                            filterType === "all"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <Compass className="w-4 h-4" />
                          <span className="text-sm">전체</span>
                        </button>
                        <button
                          onClick={() => setFilterType("balance")}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                            filterType === "balance"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <span className="text-lg">⚖️</span>
                          <span className="text-sm">밸런스 게임</span>
                        </button>
                        <button
                          onClick={() => setFilterType("multiple")}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                            filterType === "multiple"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <span className="text-lg">📝</span>
                          <span className="text-sm">객관식</span>
                        </button>
                        <button
                          onClick={() => setFilterType("ox")}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                            filterType === "ox"
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
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            filterCategory === "all"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <span className="text-base">🌟</span>
                          <span className="text-sm">전체</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("일상")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            filterCategory === "일상"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <span className="text-base">☀️</span>
                          <span className="text-sm">일상</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("음식")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            filterCategory === "음식"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <span className="text-base">🍕</span>
                          <span className="text-sm">음식</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("패션")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            filterCategory === "패션"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <span className="text-base">👕</span>
                          <span className="text-sm">패션</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("게임")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            filterCategory === "게임"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <span className="text-base">🎮</span>
                          <span className="text-sm">게임</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("학교")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            filterCategory === "학교"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <span className="text-base">🏫</span>
                          <span className="text-sm">학교</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("아이돌")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            filterCategory === "아이돌"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <span className="text-base">⭐</span>
                          <span className="text-sm">아이돌</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("영화/드라마")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            filterCategory === "영화/드라마"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <span className="text-base">🎬</span>
                          <span className="text-sm">영화/드라마</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("운동")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            filterCategory === "운동"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <span className="text-base">⚽</span>
                          <span className="text-sm">운동</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("취미")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            filterCategory === "취미"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <span className="text-base">🎨</span>
                          <span className="text-sm">취미</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("밈/유머")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            filterCategory === "밈/유머"
                              ? "border-lime-500 bg-lime-500/10 text-lime-500"
                              : "border-white/10 bg-white/5 text-white hover:border-lime-500/50"
                          }`}
                        >
                          <span className="text-base">😂</span>
                          <span className="text-sm">밈/유머</span>
                        </button>
                        <button
                          onClick={() => setFilterCategory("환경")}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            filterCategory === "환경"
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
                    {(filterType !== "all" || filterCategory !== "all" || filterSchool || filterMyVotes) && (
                      <button
                        onClick={() => {
                          setFilterType("all");
                          setFilterCategory("all");
                          setFilterSchool(false);
                          setFilterMyVotes(false);
                        }}
                        className="text-sm text-lime-500 hover:text-lime-400 transition-colors flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        필터 초기화
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[...hotVotes, ...schoolVotes, ...allVotes]
                      .filter((vote) => {
                        const typeMatch = filterType === "all" || vote.type === filterType;
                        const categoryMatch = filterCategory === "all" || vote.category === filterCategory;
                        const schoolMatch = !filterSchool || vote.schoolName;
                        const myVoteMatch = !filterMyVotes || createdVotes.some(cv => cv.id === vote.id);
                        return typeMatch && categoryMatch && schoolMatch && myVoteMatch;
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
                  <RankingBoard userPoints={userPoints} userRank={userRank} />
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
                    onRewardClick={() => setIsRewardModalOpen(true)}
                    onLogout={handleLogout}
                  />
                </div>
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

      {/* Bottom Navigation Bar - Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0f1419] border-t border-white/10 z-50">
        <div className="grid grid-cols-5 items-center h-20">
          {navItems.slice(0, 2).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 h-full transition-all ${
                activeTab === item.id
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
              className={`flex flex-col items-center justify-center gap-1 h-full transition-all ${
                activeTab === item.id
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
      <StatsModal
        vote={selectedVote}
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />

      <CreateVoteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateVote={handleCreateVote}
      />

      <RewardModal
        isOpen={isRewardModalOpen}
        onClose={() => setIsRewardModalOpen(false)}
        userPoints={userPoints}
      />

      <MyVotesSheet
        isOpen={isMyVotesSheetOpen}
        onClose={() => setIsMyVotesSheetOpen(false)}
        participatedVotes={[...hotVotes, ...schoolVotes, ...allVotes].filter(v => v.userVoted)}
        createdVotes={createdVotes}
        onVoteClick={handleViewStats}
      />

      {/* Mobile Search Sheet */}
      {isSearchOpen && (
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
      )}
    </div>
  );
}
