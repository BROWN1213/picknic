import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Users, Lightbulb, Link, Clock, Loader2 } from "lucide-react";
import type { Vote, VoteResultResponse } from "../types/vote";
import { useEffect, useState, memo } from "react";
import { voteService } from "../services/voteService";

// Helper function to calculate remaining time
function calculateTimeLeft(expiresAt: string | undefined): string {
    if (!expiresAt) return "";

    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return "마감됨";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days >= 1) return `${days}일 남음`;
    if (hours >= 1) return `${hours}시간 남음`;
    if (minutes >= 1) return `${minutes}분 남음`;
    return "곧 마감";
}

interface VoteAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    vote: Vote | null;
}

export const VoteAnalysisModal = memo(function VoteAnalysisModal({ isOpen, onClose, vote }: VoteAnalysisModalProps) {
    const [results, setResults] = useState<VoteResultResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && vote) {
            // Clear previous results to show loading animation
            setResults(null);
            setIsLoading(true);
            setError(null);

            const loadResults = async () => {
                try {
                    const data = await voteService.getVoteResults(Number(vote.id));
                    setResults(data);
                    setError(null);
                } catch (error: any) {
                    console.error("Failed to load vote results:", error);

                    // User-friendly error messages
                    if (error.isTimeout) {
                        setError("분석 데이터 로딩 시간이 초과되었습니다. 참여자가 많은 투표일 경우 시간이 걸릴 수 있습니다. 잠시 후 다시 시도해주세요.");
                    } else if (error.message) {
                        setError(error.message);
                    } else {
                        setError("투표 분석 데이터를 불러오는데 실패했습니다. 다시 시도해주세요.");
                    }
                } finally {
                    setIsLoading(false);
                }
            };
            loadResults();
        } else {
            setResults(null);
            setIsLoading(false);
            setError(null);
        }
    }, [isOpen, vote?.id]); // Only re-run when vote.id changes, not the entire vote object

    if (!vote) return null;

    if (isLoading || error || !results) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="bg-[#1a1f2e] text-white border-white/10 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                            <span className="text-lime-400">📈</span> 투표 분석 리포트
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            투표 결과와 참여자 분석 정보
                        </DialogDescription>
                    </DialogHeader>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <Loader2 className="w-16 h-16 text-lime-500 animate-spin" />
                            <p className="text-white/60 text-sm animate-pulse">분석 리포트를 불러오는 중...</p>
                            <p className="text-white/40 text-xs">참여자가 많을 경우 시간이 걸릴 수 있습니다</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                                <span className="text-4xl">⚠️</span>
                            </div>
                            <div className="text-center space-y-2 px-4">
                                <p className="text-white text-base font-medium">데이터 로딩 실패</p>
                                <p className="text-white/60 text-sm">{error}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setError(null);
                                    setIsLoading(true);
                                    voteService.getVoteResults(Number(vote.id))
                                        .then(data => {
                                            setResults(data);
                                            setError(null);
                                        })
                                        .catch((err: any) => {
                                            if (err.isTimeout) {
                                                setError("분석 데이터 로딩 시간이 초과되었습니다. 참여자가 많은 투표일 경우 시간이 걸릴 수 있습니다. 잠시 후 다시 시도해주세요.");
                                            } else {
                                                setError(err.message || "투표 분석 데이터를 불러오는데 실패했습니다.");
                                            }
                                        })
                                        .finally(() => setIsLoading(false));
                                }}
                                className="px-6 py-2 bg-lime-500 hover:bg-lime-600 text-black rounded-lg font-medium transition-colors"
                            >
                                다시 시도
                            </button>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        );
    }

    const totalVotes = results.totalVotes || vote.totalVotes;
    const analysis = results.analysis;
    const timeLeft = calculateTimeLeft(vote.expiresAt);

    // Find winning option
    const winningOption = results.results && results.results.length > 0
        ? results.results.reduce((prev, current) => (prev.voteCount > current.voteCount) ? prev : current)
        : null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#1a1f2e] text-white border-white/10 max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                        <span className="text-lime-400">📈</span> 투표 분석 리포트
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        투표 결과와 참여자 분석 정보
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-8 mt-4">
                    {/* Header Info */}
                    <div>
                        <h2 className="text-xl font-bold mb-3 leading-tight">{vote.title}</h2>
                        <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground">
                            {(results.category || vote.category) && (
                                <Badge className="bg-gradient-to-r from-lime-500 to-emerald-500 text-black hover:from-lime-600 hover:to-emerald-600 border-0 px-3 py-1 text-xs font-semibold">
                                    {results.category || vote.category}
                                </Badge>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                <span className="font-medium">{totalVotes.toLocaleString()}명 참여</span>
                            </div>
                            {timeLeft && (
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    <span className="font-medium">{timeLeft}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vote Results */}
                    <div>
                        <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                            <span>📊</span> 투표 결과
                        </h3>
                        <div className="space-y-6">
                            {results.results?.map((option) => {
                                const isWinner = winningOption && option.optionId === winningOption.optionId;
                                const voteOption = vote.options.find(o => String(o.id) === String(option.optionId));
                                return (
                                    <div key={option.optionId} className="space-y-2">
                                        <div className="flex items-center justify-between text-base">
                                            <div className="flex items-center gap-3">
                                                {voteOption?.emoji && (
                                                    <span className="text-2xl">{voteOption.emoji}</span>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-semibold ${isWinner ? "text-white text-base" : "text-white/80"}`}>
                                                        {option.text}
                                                    </span>
                                                    {isWinner && (
                                                        <Badge className="bg-gradient-to-r from-lime-500 to-emerald-500 text-black hover:from-lime-600 hover:to-emerald-600 border-0 px-2 py-0.5 text-xs font-bold">
                                                            내 1위!
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`font-bold text-xl ${isWinner ? "text-lime-400" : "text-white/50"}`}>
                                                {Math.round(option.percentage)}%
                                            </span>
                                        </div>
                                        <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${isWinner ? "bg-gradient-to-r from-lime-500 to-emerald-500" : "bg-white/30"
                                                    }`}
                                                style={{ width: `${option.percentage}%` }}
                                            />
                                        </div>
                                        <div className="text-sm text-white/60 pl-1">
                                            {option.voteCount.toLocaleString()}명 투표
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Option Analysis */}
                    {analysis?.optionAnalyses && analysis.optionAnalyses.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <span>🔍</span> 선택지별 참여자 분석
                            </h3>
                            <div className="space-y-4">
                                {analysis.optionAnalyses.map((optionAnalysis) => {
                                    const voteOption = vote.options.find(o => String(o.id) === String(optionAnalysis.optionId));
                                    return (
                                        <div key={optionAnalysis.optionId} className="bg-black/30 rounded-xl p-5 border border-white/10">
                                            <div className="flex items-center gap-2 mb-4">
                                                {voteOption?.emoji && (
                                                    <span className="text-2xl">{voteOption.emoji}</span>
                                                )}
                                                <h4 className="font-bold text-base text-white">{optionAnalysis.optionText}</h4>
                                            </div>

                                            {/* Gender Stats */}
                                            <div className="mb-4">
                                                <p className="text-sm text-white/60 mb-2">성별 분포</p>
                                                <div className="flex gap-3">
                                                    {Object.entries(optionAnalysis.genderStats).map(([gender, percentage]) => (
                                                        <div key={gender} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                                                            <span className="text-sm text-white/80">{gender}</span>
                                                            <span className="text-sm font-bold text-lime-400">{percentage}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Top Interests */}
                                            {optionAnalysis.topInterests.length > 0 && (
                                                <div>
                                                    <p className="text-sm text-white/60 mb-2">인기 관심사</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {optionAnalysis.topInterests.map((interest, idx) => (
                                                            <Badge key={idx} variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-0 px-3 py-1 text-xs">
                                                                {interest}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Participant Analysis */}
                    {analysis && (
                        <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
                            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                                <span>👥</span> 참여자 분석
                            </h3>

                            <div className="flex items-center justify-between mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
                                <span className="text-white/90 font-medium">가장 많이 참여한 연령대</span>
                                <Badge className="bg-gradient-to-r from-lime-500 to-emerald-500 text-black hover:from-lime-600 hover:to-emerald-600 border-0 text-sm px-3 py-1 font-bold">
                                    {analysis.mostParticipatedAgeGroup} {analysis.mostParticipatedPercentage}%
                                </Badge>
                            </div>

                            <div className="space-y-3.5">
                                {analysis.ageGroupStats?.map((stat, index) => {
                                    const isTopGroup = stat.label === analysis.mostParticipatedAgeGroup;
                                    return (
                                        <div key={index} className="flex items-center gap-3 text-sm">
                                            <span className={`w-20 font-medium ${isTopGroup ? 'text-white' : 'text-white/70'}`}>
                                                {stat.label}
                                            </span>
                                            <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700`}
                                                    style={{
                                                        width: `${stat.percentage}%`,
                                                        background: isTopGroup
                                                            ? 'linear-gradient(to right, rgb(132, 204, 22), rgb(16, 185, 129))'
                                                            : 'linear-gradient(to right, rgb(148, 163, 184), rgb(203, 213, 225))'
                                                    }}
                                                />
                                            </div>
                                            <span className={`w-10 text-right font-medium ${isTopGroup ? 'text-white' : 'text-white/60'}`}>
                                                {stat.percentage}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Related Interests */}
                    {analysis && (
                        <div>
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                                <Link className="w-5 h-5" /> 관련 관심사
                            </h3>
                            <p className="text-sm text-white/60 mb-4">
                                이 투표에 참여한 사람들은 다음 키워드에도 관심이 많아요
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {analysis.relatedInterests?.map((interest, index) => (
                                    <Badge key={index} variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-0 px-4 py-2 text-sm font-medium">
                                        {interest}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fun Fact */}
                    {analysis && (
                        <div className="bg-gradient-to-br from-lime-500/20 via-emerald-500/15 to-teal-500/10 border border-lime-500/20 rounded-2xl p-6">
                            <h3 className="text-lime-400 font-bold mb-2 flex items-center gap-2 text-lg">
                                <Lightbulb className="w-5 h-5" /> 재미있는 사실
                            </h3>
                            <p className="text-base text-white/90 leading-relaxed">
                                {analysis.funFact}
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
});
