import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Gift, Coffee, ShoppingBag, Gamepad } from "lucide-react";
import { toast } from "sonner";
import { rewardService } from "../services/rewardService";
import type { Reward } from "../types/reward";

interface RewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPoints: number;
}

export function RewardModal({
  isOpen,
  onClose,
  userPoints,
}: RewardModalProps) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadRewards();
    }
  }, [isOpen]);

  const loadRewards = async () => {
    setIsLoading(true);
    try {
      const data = await rewardService.getRewards();
      setRewards(data.rewards);
    } catch (error) {
      console.error('Failed to load rewards:', error);
      toast.error('리워드 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExchange = async (reward: Reward) => {
    if (userPoints < reward.cost) {
      toast.error("포인트가 부족합니다");
      return;
    }

    if (reward.stock <= 0) {
      toast.error("재고가 부족합니다");
      return;
    }

    try {
      await rewardService.redeemReward(reward.id);
      toast.success(`${reward.name}를 교환했습니다!`);
      await loadRewards(); // Reload rewards to update stock
      onClose();
    } catch (error) {
      console.error('Failed to redeem reward:', error);
      toast.error('리워드 교환에 실패했습니다.');
    }
  };

  const getRewardIcon = (rewardName: string) => {
    if (rewardName.includes("스타벅스") || rewardName.includes("커피")) {
      return <Coffee className="w-8 h-8" />;
    }
    if (rewardName.includes("편의점") || rewardName.includes("기프티콘")) {
      return <ShoppingBag className="w-8 h-8" />;
    }
    if (rewardName.includes("게임")) {
      return <Gamepad className="w-8 h-8" />;
    }
    return <Gift className="w-8 h-8" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-[#1DB954]" />
            포인트 보상
          </DialogTitle>
        </DialogHeader>

        {/* User Points */}
        <div className="mb-6">
          <Card className="p-4 bg-gradient-to-br from-[#1DB954]/20 to-[#1aa34a]/20 border border-[#1DB954]/30">
            <div className="flex items-center justify-between">
              <span className="text-white">보유 포인트</span>
              <span className="text-2xl text-[#1DB954]">{userPoints}P</span>
            </div>
          </Card>
        </div>

        {/* Rewards Grid */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">로딩 중...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {rewards.map((reward) => (
              <Card
                key={reward.id}
                className="p-4 bg-card border-white/10 hover:border-[#1DB954]/30 transition-all"
              >
                <div className="flex items-center gap-4 mb-3">
                  {reward.imageUrl ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white">
                      <img
                        src={`/${reward.imageUrl}`}
                        alt={reward.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1DB954] to-[#1aa34a] flex items-center justify-center text-white">
                      {getRewardIcon(reward.name)}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-white mb-1">{reward.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {reward.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-[#1DB954]/20 text-[#1DB954] border-0">
                      {reward.cost}P
                    </Badge>
                    {reward.stock > 0 && reward.stock <= 10 && (
                      <Badge className="ml-2 bg-orange-500/20 text-orange-500 border-0">
                        재고 {reward.stock}개
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleExchange(reward)}
                    disabled={userPoints < reward.cost || reward.stock <= 0}
                    className="bg-gradient-to-r from-[#1DB954] to-[#1aa34a] hover:from-[#1aa34a] hover:to-[#179443] text-black border-0"
                  >
                    {reward.stock <= 0 ? "품절" : "교환"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 교환한 보상은 마이페이지에서 확인할 수 있습니다</p>
          <p>• 포인트는 투표 참여, 투표 생성, 출석 체크로 얻을 수 있습니다</p>
          <p>• 교환 후 취소나 환불은 불가능합니다</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
