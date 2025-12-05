import { useState, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { TrendingUp, Users, ChevronRight, Archive, CheckCircle, Trash2, Clock } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

export type VoteType = "balance" | "multiple" | "ox";

export interface VoteOption {
  id: string;
  text: string;
  image?: string;
  votes: number;
  emoji?: string;
}

export interface Vote {
  id: string;
  type: VoteType;
  title: string;
  description?: string;
  options: VoteOption[];
  totalVotes: number;
  category: string;
  isHot?: boolean;
  timeLeft?: string;
  points?: number;
  userVoted?: string | null;
  schoolName?: string;
  status?: 'active' | 'closed' | 'expired';
  creatorId?: string;
}

interface VotingCardProps {
  vote: Vote;
  onVote: (voteId: string, optionId: string) => void;
  onViewStats: (vote: Vote) => void;
  onDelete?: (voteId: string) => void;
  currentUserId?: string;
  isSystemAccount?: boolean;
}

export function VotingCard({ vote, onVote, onViewStats, onDelete, currentUserId, isSystemAccount }: VotingCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(
    vote.userVoted || null
  );
  const [hasVoted, setHasVoted] = useState(!!vote.userVoted);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingOption, setAnimatingOption] = useState<VoteOption | null>(null);
  const [animationPositions, setAnimationPositions] = useState({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
  });
  const ballotBoxRef = useRef<HTMLDivElement>(null);

  // Check if vote is expired or closed
  const isVoteExpired = vote.status === 'expired' || vote.status === 'closed';
  const canVote = !hasVoted && !isVoteExpired;

  const handleVote = (optionId: string, optionData: VoteOption, event: React.MouseEvent) => {
    if (!canVote) return;

    // Get absolute positions
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const ballotRect = ballotBoxRef.current?.getBoundingClientRect();

    if (ballotRect) {
      // Calculate center of button (start position)
      const startX = buttonRect.left + buttonRect.width / 2;
      const startY = buttonRect.top + buttonRect.height / 2;

      // Calculate center of ballot box (end position)
      const endX = ballotRect.left + ballotRect.width / 2;
      const endY = ballotRect.top + ballotRect.height / 2;

      setAnimationPositions({
        startX,
        startY,
        endX,
        endY
      });
    }

    setIsAnimating(true);
    setSelectedOption(optionId);
    setAnimatingOption(optionData);

    setTimeout(() => {
      setHasVoted(true);
      onVote(vote.id, optionId);
    }, 1200);

    setTimeout(() => {
      setIsAnimating(false);
      setAnimatingOption(null);
    }, 1400);
  };

  const getPercentage = (votes: number) => {
    return vote.totalVotes > 0 ? Math.round((votes / vote.totalVotes) * 100) : 0;
  };

  // Category-based color schemes
  const getCategoryColors = (category: string) => {
    const colors: Record<string, { from: string; to: string; accent: string }> = {
      "음식": { from: "#f97316", to: "#ef4444", accent: "#f97316" },
      "패션": { from: "#8b5cf6", to: "#ec4899", accent: "#8b5cf6" },
      "게임": { from: "#3b82f6", to: "#14b8a6", accent: "#3b82f6" },
      "일상": { from: "#eab308", to: "#f97316", accent: "#eab308" },
      "학교": { from: "#3b82f6", to: "#8b5cf6", accent: "#3b82f6" },
      "아이돌": { from: "#ec4899", to: "#8b5cf6", accent: "#ec4899" },
      "영화/드라마": { from: "#ef4444", to: "#8b5cf6", accent: "#ef4444" },
      "운동": { from: "#14b8a6", to: "#3b82f6", accent: "#14b8a6" },
      "취미": { from: "#8b5cf6", to: "#3b82f6", accent: "#8b5cf6" },
      "밈/유머": { from: "#ec4899", to: "#f97316", accent: "#ec4899" },
      "환경": { from: "#10b981", to: "#84cc16", accent: "#10b981" },
    };
    return colors[category] || { from: "#1DB954", to: "#1aa34a", accent: "#1DB954" };
  };

  const categoryColors = getCategoryColors(vote.category);

  // Check if current user can delete this vote
  const canDelete = onDelete && (
    (currentUserId && vote.creatorId === currentUserId) || // User is creator
    isSystemAccount // Or user is system account
  );

  return (
    <Card className="overflow-visible bg-card hover:bg-white/5 transition-all duration-300 border-white/10 relative group">
      {/* Gradient Accent Bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(to right, ${categoryColors.from}, ${categoryColors.to})`
        }}
      />

      {/* Delete Button (below ballot box) */}
      {canDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="absolute right-4 z-30 flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500/50 hover:border-red-500 rounded-lg transition-all duration-200 shadow-lg hover:shadow-red-500/25 hover:scale-105 active:scale-95"
              style={{ top: '92px' }}
            >
              <Trash2 className="w-4 h-4" />
              <span>삭제</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>투표를 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                이 작업은 되돌릴 수 없습니다. 투표와 모든 투표 결과가 영구적으로 삭제됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(vote.id)}
                className="bg-red-500 hover:bg-red-600"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Ballot Box */}
      <div
        ref={ballotBoxRef}
        className="absolute top-4 right-4 z-20"
      >
        <motion.div
          animate={isAnimating ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${categoryColors.from}, ${categoryColors.to})`,
              boxShadow: isAnimating ? '0 0 20px rgba(29, 185, 84, 0.5)' : 'none'
            }}
          >
            <Archive className="w-6 h-6 text-black" />
          </div>
          {isAnimating && (
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${categoryColors.from}, ${categoryColors.to})`,
              }}
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 0.6, repeat: 2 }}
            />
          )}
        </motion.div>
      </div>

      {/* Flying Paper Animation */}
      <AnimatePresence>
        {isAnimating && animatingOption && (
          <motion.div
            className="fixed pointer-events-none z-[100]"
            initial={{
              left: animationPositions.startX,
              top: animationPositions.startY,
              x: '-50%',
              y: '-50%',
              scale: 1,
              opacity: 1,
              rotateX: 0,
              rotateY: 0,
              rotateZ: 0,
            }}
            animate={{
              left: animationPositions.endX,
              top: animationPositions.endY,
              scale: [1, 0.9, 0.4, 0.1],
              rotateX: [0, 30, 60, 120],
              rotateY: [0, 10, 20, 30],
              rotateZ: [0, -10, 10, -5],
              opacity: [1, 1, 0.8, 0],
            }}
            transition={{
              duration: 1.2,
              ease: [0.43, 0.13, 0.23, 0.96],
            }}
            style={{
              transformStyle: 'preserve-3d',
              perspective: '1000px',
            }}
          >
            <div
              className="p-6 rounded-lg border-2 shadow-2xl backdrop-blur-sm min-w-[120px]"
              style={{
                background: `linear-gradient(135deg, ${categoryColors.from}40, ${categoryColors.to}40)`,
                borderColor: categoryColors.accent,
                boxShadow: `0 10px 40px ${categoryColors.accent}60`,
              }}
            >
              {animatingOption.emoji && (
                <div className="text-4xl text-center mb-2">{animatingOption.emoji}</div>
              )}
              <div className="text-white text-center font-semibold">{animatingOption.text}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className="border-0"
              style={{
                background: `linear-gradient(135deg, ${categoryColors.from}, ${categoryColors.to})`,
                color: '#000'
              }}
            >
              {vote.category}
            </Badge>
            {isVoteExpired && (
              <Badge className="gap-1 bg-gray-500 hover:bg-gray-600 text-white border-0">
                <Clock className="w-3 h-3" />
                {vote.status === 'closed' ? '종료됨' : '마감됨'}
              </Badge>
            )}
            {vote.isHot && !isVoteExpired && (
              <Badge className="gap-1 bg-[#1DB954] hover:bg-[#1ED760] text-black border-0 animate-pulse">
                <TrendingUp className="w-3 h-3" />
                HOT
              </Badge>
            )}
            {vote.points && (
              <Badge
                variant="outline"
                className="border-0"
                style={{
                  backgroundColor: `${categoryColors.accent}20`,
                  borderColor: `${categoryColors.accent}40`,
                  color: categoryColors.accent
                }}
              >
                +{vote.points}P
              </Badge>
            )}
          </div>
        </div>

        <h3 className="mb-1 text-white">{vote.title}</h3>
        {vote.description && (
          <p className="text-sm text-muted-foreground">{vote.description}</p>
        )}

        <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{vote.totalVotes.toLocaleString()}명 참여</span>
          </div>
          {vote.timeLeft && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{vote.timeLeft}</span>
            </div>
          )}
          {vote.schoolName && (
            <div className="text-xs bg-white/5 px-2 py-1 rounded">
              📍 {vote.schoolName}
            </div>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="p-4">
        {vote.type === "balance" && (
          <div className="grid grid-cols-2 gap-3">
            {vote.options.map((option) => {
              const percentage = getPercentage(option.votes);
              const isSelected = selectedOption === option.id;
              const maxVotes = Math.max(...vote.options.map(o => o.votes));
              const winnersCount = vote.options.filter(o => o.votes === maxVotes).length;
              const showResults = hasVoted || isVoteExpired;
              const isWinning = showResults && option.votes === maxVotes && winnersCount === 1;

              return (
                <button
                  key={option.id}
                  onClick={(e) => handleVote(option.id, option, e)}
                  disabled={!canVote}
                  className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${!canVote
                    ? isSelected
                      ? "bg-white/5 scale-105"
                      : "border-white/10 bg-white/5"
                    : "border-white/20 hover:bg-white/5 active:scale-95"
                    } ${isAnimating && isSelected ? "opacity-50" : ""}`}
                  style={!canVote && isSelected ? {
                    borderColor: categoryColors.accent,
                    backgroundColor: `${categoryColors.accent}20`,
                    boxShadow: `0 0 20px ${categoryColors.accent}40, 0 0 40px ${categoryColors.accent}20`
                  } : !canVote ? {} : {
                    borderColor: 'rgba(255,255,255,0.2)'
                  }}
                >
                  {showResults && (
                    <div
                      className="absolute inset-0 rounded-lg"
                      style={{
                        width: `${percentage}%`,
                        background: `linear-gradient(90deg, ${categoryColors.accent}30, ${categoryColors.accent}10)`
                      }}
                    />
                  )}
                  {showResults && isSelected && (
                    <div className="absolute top-2 right-2 z-20">
                      <CheckCircle
                        className="w-6 h-6"
                        style={{ color: categoryColors.accent }}
                        strokeWidth={2.5}
                      />
                    </div>
                  )}
                  <div className="relative z-10">
                    {option.image && (
                      <div className="mb-2 rounded-lg overflow-hidden">
                        <ImageWithFallback
                          src={option.image}
                          alt={option.text || "Option"}
                          className="w-full h-24 object-cover"
                        />
                      </div>
                    )}
                    {option.emoji && <div className="text-3xl mb-2">{option.emoji}</div>}
                    <div className="mb-2 text-white">{option.text}</div>
                    {showResults && (
                      <div className="flex items-center justify-between mt-2">
                        <span style={{ color: categoryColors.accent }}>{percentage}%</span>
                        {isWinning && (
                          <Badge
                            className="text-xs border-0"
                            style={{
                              background: `linear-gradient(135deg, ${categoryColors.from}, ${categoryColors.to})`,
                              color: '#000'
                            }}
                          >
                            우세
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}



        {vote.type === "multiple" && (
          <div className="space-y-2">
            {vote.options.map((option) => {
              const percentage = getPercentage(option.votes);
              const isSelected = selectedOption === option.id;
              const showResults = hasVoted || isVoteExpired;

              return (
                <button
                  key={option.id}
                  onClick={(e) => handleVote(option.id, option, e)}
                  disabled={!canVote}
                  className={`relative w-full p-4 rounded-lg border-2 transition-all duration-300 text-left ${!canVote
                    ? isSelected
                      ? "scale-[1.02]"
                      : "border-white/10 bg-white/5"
                    : "border-white/20 hover:bg-white/5 active:scale-[0.98]"
                    } ${isAnimating && isSelected ? "opacity-50" : ""}`}
                  style={!canVote && isSelected ? {
                    borderColor: categoryColors.accent,
                    backgroundColor: `${categoryColors.accent}20`,
                    boxShadow: `0 0 20px ${categoryColors.accent}40, 0 0 40px ${categoryColors.accent}20`
                  } : {}}
                >
                  {option.image && (
                    <div className="mb-3 rounded-lg overflow-hidden">
                      <ImageWithFallback
                        src={option.image}
                        alt={option.text || "Option"}
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-white">
                      {option.emoji && <span className="text-xl">{option.emoji}</span>}
                      <span>{option.text}</span>
                    </span>
                    {showResults && (
                      <span className="flex items-center gap-1.5">
                        {isSelected && (
                          <CheckCircle
                            className="w-5 h-5"
                            style={{ color: categoryColors.accent }}
                            strokeWidth={2.5}
                          />
                        )}
                        <span style={{ color: categoryColors.accent }}>{percentage}%</span>
                      </span>
                    )}
                  </div>
                  {showResults && (
                    <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          background: `linear-gradient(90deg, ${categoryColors.from}, ${categoryColors.to})`
                        }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {vote.type === "ox" && (
          <div className="grid grid-cols-2 gap-4">
            {vote.options.map((option) => {
              const percentage = getPercentage(option.votes);
              const isSelected = selectedOption === option.id;
              const isO = option.text === "O";
              const showResults = hasVoted || isVoteExpired;

              return (
                <button
                  key={option.id}
                  onClick={(e) => handleVote(option.id, option, e)}
                  disabled={!canVote}
                  className={`relative p-8 rounded-lg border-2 transition-all duration-300 ${!canVote
                    ? isSelected
                      ? "scale-105"
                      : "border-white/10 bg-white/5"
                    : "border-white/20 hover:bg-white/5"
                    } active:scale-95 ${isAnimating && isSelected ? "opacity-50" : ""}`}
                  style={!canVote && isSelected ? {
                    borderColor: categoryColors.accent,
                    backgroundColor: `${categoryColors.accent}20`,
                    boxShadow: `0 0 20px ${categoryColors.accent}40, 0 0 40px ${categoryColors.accent}20`
                  } : {}}
                >
                  {showResults && isSelected && (
                    <div className="absolute top-3 right-3 z-20">
                      <CheckCircle
                        className="w-7 h-7"
                        style={{ color: categoryColors.accent }}
                        strokeWidth={2.5}
                      />
                    </div>
                  )}
                  <div
                    className="text-6xl text-center"
                    style={{
                      color: isO ? "#3b82f6" : "#ef4444"
                    }}
                  >
                    {option.text}
                  </div>
                  {showResults && (
                    <div className="mt-4 text-center">
                      <div
                        className="text-2xl"
                        style={{ color: categoryColors.accent }}
                      >
                        {percentage}%
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {(hasVoted || isVoteExpired) && (
          <Button
            variant="ghost"
            className="w-full mt-4 gap-2 hover:bg-white/5 text-muted-foreground hover:text-white"
            onClick={() => onViewStats(vote)}
          >
            상세 통계 보기
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
