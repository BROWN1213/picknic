import { useState, useEffect, useCallback, memo, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { Plus, X, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { voteService } from "../services/voteService";
import { pointService } from "../services/pointService";

interface VoteOption {
  text: string;
  emoji: string;
  image?: string;
}

export interface CreateVoteData {
  type: string;
  title: string;
  description: string;
  imageUrl?: string; // S3 이미지 URL
  category: string;
  options: Array<{
    id: string;
    text?: string;
    emoji?: string;
    image?: string;
    votes: number;
  }>;
  timeLeft?: string;
}

interface CreateVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateVote: (voteData: CreateVoteData) => void;
}

// Move emoji list outside component to prevent re-creation on every render
const emojiSuggestions = [
  // 감정/표정
  "😊",
  "😂",
  "🤣",
  "😍",
  "🥰",
  "😎",
  "🤔",
  "😭",
  "😱",
  "🤯",
  "😤",
  "🥺",
  "😏",
  "🤪",
  "🤗",
  "😴",
  "🥱",
  "🤮",
  "😇",
  "🤓",

  // 음식
  "🍕",
  "🍔",
  "🍟",
  "🌭",
  "🍿",
  "🧂",
  "🥓",
  "🥚",
  "🧇",
  "🥞",
  "🧈",
  "🍞",
  "🥐",
  "🥖",
  "🥨",
  "🥯",
  "🧀",
  "🍖",
  "🍗",
  "🥩",
  "🍤",
  "🍱",
  "🍛",
  "🍜",
  "🍝",
  "🍠",
  "🍢",
  "🍣",
  "🍥",
  "🍡",
  "🥟",
  "🥠",
  "🥡",
  "🦪",
  "🍦",
  "🍧",
  "🍨",
  "🍩",
  "🍪",
  "🎂",
  "🍰",
  "🧁",
  "🥧",
  "🍫",
  "🍬",
  "🍭",
  "🍮",
  "🍯",
  "🍼",
  "🥛",
  "☕",
  "🍵",
  "🧃",
  "🥤",
  "🧋",
  "🍶",
  "🍺",
  "🍻",
  "🥂",
  "🍷",
  "🥃",
  "🍸",
  "🍹",
  "🧉",
  "🍾",
  "🧊",
  "🥄",
  "🍴",
  "🍽️",
  "🥢",

  // 스포츠/운동
  "⚽",
  "🏀",
  "🏈",
  "⚾",
  "🥎",
  "🎾",
  "🏐",
  "🏉",
  "🥏",
  "🎱",
  "🏓",
  "🏸",
  "🏒",
  "🏑",
  "🥍",
  "🏏",
  "🪃",
  "🥅",
  "⛳",
  "🪁",
  "🤿",
  "🥊",
  "🥋",
  "🎽",
  "🛹",
  "🛼",
  "🛷",
  "⛸️",
  "🥌",
  "🎿",
  "⛷️",
  "🏂",
  "🏋️",
  "🤸",
  "🤼",
  "🤽",
  "🤾",
  "🏆",
  "🥇",
  "🥈",
  "🥉",
  "🏅",
  "🎖️",
  "🏵️",
  "💪",

  // 게임/엔터
  "🎮",
  "🕹️",
  "🎯",
  "🎲",
  "🃏",
  "🀄",
  "🎭",
  "🎪",
  "🎬",
  "🎤",
  "🎧",
  "🎼",
  "🎹",
  "🥁",
  "🎷",
  "🎺",
  "🎸",
  "🪕",
  "🎻",
  "🎰",
  "🎳",

  // 패션/액세서리
  "👕",
  "👔",
  "👗",
  "👘",
  "🥻",
  "🩱",
  "🩲",
  "🩳",
  "👖",
  "👚",
  "🧥",
  "🥼",
  "🦺",
  "👞",
  "👟",
  "🥾",
  "🥿",
  "👠",
  "👡",
  "🩰",
  "👢",
  "👑",
  "👒",
  "🎩",
  "🎓",
  "🧢",
  "⛑️",
  "🪖",
  "💄",
  "💍",
  "👓",
  "🕶️",
  "🥽",
  "🌂",
  "🧳",
  "👜",
  "👝",
  "👛",
  "🎒",

  // 자연/날씨
  "☀️",
  "🌙",
  "⭐",
  "⚡",
  "🔥",
  "💧",
  "❄️",
  "☃️",
  "🌈",
  "🌸",
  "🌺",
  "🌻",
  "🌹",
  "🌷",
  "🌱",
  "🌿",
  "🍀",
  "🍄",
  "🌾",
  "🌵",
  "🌴",
  "🌳",
  "🌲",
  "🎋",
  "🎍",

  // 동물
  "🐶",
  "🐱",
  "🐭",
  "🐹",
  "🐰",
  "🦊",
  "🐻",
  "🐼",
  "🐨",
  "🐯",
  "🦁",
  "🐮",
  "🐷",
  "🐸",
  "🐵",
  "🐔",
  "🐧",
  "🐦",
  "🐤",
  "🦆",
  "🦅",
  "🦉",
  "🦇",
  "🐺",
  "🐗",
  "🐴",
  "🦄",
  "🐝",
  "🐛",
  "🦋",
  "🐌",
  "🐞",
  "🐜",
  "🦟",
  "🦗",
  "🕷️",
  "🦂",
  "🐢",
  "🐍",
  "🦎",
  "🦖",
  "🦕",
  "🐙",
  "🦑",
  "🦐",
  "🦞",
  "🦀",
  "🐡",
  "🐠",
  "🐟",
  "🐬",
  "🐳",
  "🐋",
  "🦈",
  "🐊",
  "🐅",
  "🐆",
  "🦓",
  "🦍",
  "🦧",

  // 교통/여행
  "🚗",
  "🚕",
  "🚙",
  "🚌",
  "🚎",
  "🏎️",
  "🚓",
  "🚑",
  "🚒",
  "🚐",
  "🛻",
  "🚚",
  "🚛",
  "🚜",
  "🦯",
  "🦽",
  "🦼",
  "🛴",
  "🚲",
  "🛵",
  "🏍️",
  "🛺",
  "🚨",
  "🚔",
  "🚍",
  "🚘",
  "🚖",
  "🚡",
  "🚠",
  "🚟",
  "🚃",
  "🚋",
  "🚞",
  "🚝",
  "🚄",
  "🚅",
  "🚈",
  "🚂",
  "🚆",
  "✈️",
  "🛫",
  "🛬",
  "🪂",
  "💺",
  "🚁",
  "🛩️",
  "🛸",
  "🚀",
  "🛰️",
  "🚢",

  // 생활/사물
  "📱",
  "💻",
  "⌨️",
  "🖥️",
  "🖨️",
  "🖱️",
  "🖲️",
  "💽",
  "💾",
  "💿",
  "📀",
  "🧮",
  "🎥",
  "📷",
  "📸",
  "📹",
  "📼",
  "🔍",
  "🔎",
  "🕯️",
  "💡",
  "🔦",
  "🏮",
  "🪔",
  "📔",
  "📕",
  "📖",
  "📗",
  "📘",
  "📙",
  "📚",
  "📓",
  "📒",
  "📃",
  "📜",
  "📄",
  "📰",
  "🗞️",
  "📑",
  "🔖",
  "🏷️",
  "💰",
  "🪙",
  "💴",
  "💵",
  "💶",
  "💷",
  "💸",
  "💳",
  "🧾",
  "💎",
  "⚖️",
  "🪜",
  "🧰",
  "🪛",
  "🔧",
  "🔨",
  "⚒️",
  "🛠️",
  "⛏️",

  // 기호/마크
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🖤",
  "🤍",
  "🤎",
  "💔",
  "❣️",
  "💕",
  "💞",
  "💓",
  "💗",
  "💖",
  "💘",
  "💝",
  "💟",
  "☮️",
  "✝️",
  "☪️",
  "🕉️",
  "☸️",
  "✡️",
  "🔯",
  "🕎",
  "☯️",
  "☦️",
  "⛎",
  "♈",
  "♉",
  "♊",
  "♋",
  "♌",
  "♍",
  "♎",
  "♏",
  "♐",
  "♑",
  "♒",
  "♓",
  "🆔",
  "⚛️",
  "🉑",
  "☢️",
  "☣️",
  "📴",
  "📳",
  "🈶",
  "💯",
  "🔞",
  "💢",
  "♨️",
  "🚷",
  "🚯",
  "🚳",
  "🚱",
  "📵",

  // 파티/축하
  "🎉",
  "🎊",
  "🎈",
  "🎁",
  "🎀",
  "🪅",
  "🪆",
  "🎏",
  "🎐",
  "🧧",
  "✨",
  "🎇",
  "🎆",
  "🌠",
  "💫",
  "🌟",
  "💥",
  "💦",
  "💨",

  // 카드/게임
  "♠️",
  "♣️",
  "♥️",
  "♦️",
  "🎴",

  // 기타
  "🌶️",
  "🔪",
  "🗡️",
  "⚔️",
  "🛡️",
  "🏹",
  "🔱",
  "⚓",
  "🎣",
  "🧲",
  "💣",
  "💉",
  "🧬",
  "🧪",
  "🌡️",
  "🧹",
  "🧺",
  "🧻",
  "🚽",
  "🚰",
  "🔑",
  "🗝️",
  "🔐",
  "🔒",
  "🔓",
  "🔔",
  "🔕",
  "📣",
  "📢",
  "💬",
  "💭",
  "🗯️",
  "🏁",
  "🚩",
  "🏴",
  "🏳️",
  "🏳️‍🌈",
  "🏴‍☠️",
  "🇰🇷",
  "🎨",
];

// Memoized option item component to prevent unnecessary re-renders
interface VoteOptionItemProps {
  option: VoteOption;
  index: number;
  canRemove: boolean;
  onOptionChange: (index: number, field: keyof VoteOption, value: string) => void;
  onRemove: (index: number) => void;
  onImageUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  emojiSuggestions: string[];
}

const VoteOptionItem = memo(({
  option,
  index,
  canRemove,
  onOptionChange,
  onRemove,
  onImageUpload,
  emojiSuggestions,
}: VoteOptionItemProps) => {
  // Memoize emoji grid to prevent re-rendering when typing
  const emojiGrid = useMemo(() => (
    <div className="grid grid-cols-8 gap-0.5 p-1">
      {emojiSuggestions.map((emoji) => (
        <SelectItem
          key={emoji}
          value={emoji}
          className="hover:bg-white/10 cursor-pointer flex items-center justify-center p-1 h-8"
        >
          <span className="text-base">{emoji}</span>
        </SelectItem>
      ))}
    </div>
  ), [emojiSuggestions]);

  return (
    <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
      <div className="flex items-start gap-2 mb-2">
        <Badge className="bg-lime-500 text-black border-0 text-xs h-5">
          {index + 1}
        </Badge>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            className="ml-auto h-5 w-5 text-white hover:bg-white/10"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {/* Text and Emoji */}
        <div className="flex gap-1.5">
          <Select
            value={option.emoji}
            onValueChange={(value) => onOptionChange(index, "emoji", value)}
          >
            <SelectTrigger className="w-12 h-8 bg-white/5 border-white/10 text-white p-1">
              <SelectValue placeholder="😊" />
            </SelectTrigger>
            <SelectContent className="bg-[#242b3d] border-white/10 max-h-60">
              {emojiGrid}
            </SelectContent>
          </Select>
          <Input
            placeholder={`선택지 ${index + 1}`}
            value={option.text}
            onChange={(e) => onOptionChange(index, "text", e.target.value)}
            maxLength={50}
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground text-sm h-8"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            이미지 추가 (선택)
          </label>
          {option.image ? (
            <div className="relative group">
              <ImageWithFallback
                src={option.image}
                alt={`선택지 ${index + 1}`}
                className="w-full h-20 object-cover rounded-lg"
              />
              <button
                onClick={() => onOptionChange(index, "image", "")}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-lime-500/50 transition-colors bg-white/5">
              <Upload className="w-4 h-4 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">
                클릭하여 업로드
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onImageUpload(index, e)}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
});

VoteOptionItem.displayName = "VoteOptionItem";

export function CreateVoteModal({
  isOpen,
  onClose,
  onCreateVote,
}: CreateVoteModalProps) {
  const [step, setStep] = useState<number>(1);
  const [voteType, setVoteType] = useState<string>("balance");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [options, setOptions] = useState<VoteOption[]>([
    { text: "", emoji: "" },
    { text: "", emoji: "" },
  ]);
  const [createRemaining, setCreateRemaining] = useState<number>(5);

  // 밸런스 게임일 때 항상 2개의 선택지로 고정
  useEffect(() => {
    if (voteType === "balance") {
      setOptions([
        { text: "", emoji: "" },
        { text: "", emoji: "" },
      ]);
    }
  }, [voteType]);

  // 일일 제한 정보 가져오기
  useEffect(() => {
    if (isOpen) {
      const fetchDailyLimit = async () => {
        try {
          const data = await pointService.getDailyLimit();
          setCreateRemaining(data.createRemaining);
        } catch (error) {
          console.error("Failed to fetch daily limit:", error);
        }
      };
      fetchDailyLimit();
    }
  }, [isOpen]);

  const voteTypes = [
    {
      value: "balance",
      label: "밸런스 게임",
      emoji: "⚖️",
      description: "A vs B 중 하나를 선택",
    },
    {
      value: "multiple",
      label: "객관식 투표",
      emoji: "📝",
      description: "여러 선택지 중 하나 선택",
    },
    {
      value: "ox",
      label: "O/X 투표",
      emoji: "⭕",
      description: "찬성 또는 반대",
    },
  ];

  const categories = [
    { value: "일상", emoji: "☀️" },
    { value: "음식", emoji: "🍕" },
    { value: "패션", emoji: "👕" },
    { value: "게임", emoji: "🎮" },
    { value: "아이돌", emoji: "⭐" },
    { value: "학교", emoji: "🏫" },
    { value: "영화/드라마", emoji: "🎬" },
    { value: "운동", emoji: "⚽" },
    { value: "취미", emoji: "🎨" },
    { value: "밈/유머", emoji: "😂" },
  ];

  // Memoize handlers to prevent re-creating functions on every render
  const handleAddOption = useCallback(() => {
    if (options.length < 5 && voteType !== "balance") {
      setOptions([...options, { text: "", emoji: "" }]);
    }
  }, [options, voteType]);

  const handleRemoveOption = useCallback((index: number) => {
    setOptions((prev) => {
      if (prev.length > 2 && voteType !== "balance") {
        return prev.filter((_, i) => i !== index);
      }
      return prev;
    });
  }, [voteType]);

  const handleOptionChange = useCallback((
    index: number,
    field: keyof VoteOption,
    value: string
  ) => {
    setOptions((prev) => {
      const newOptions = [...prev];
      newOptions[index] = { ...newOptions[index], [field]: value };
      return newOptions;
    });
  }, []);

  const handleImageUpload = useCallback((
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 제한 (5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        toast.error('이미지 크기는 5MB 이하여야 합니다.');
        e.target.value = '';
        return;
      }

      // 이미지 파일 형식 확인
      if (!file.type.startsWith('image/')) {
        toast.error('이미지 파일만 업로드 가능합니다.');
        e.target.value = '';
        return;
      }

      // 이미지 크기(해상도) 확인
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        // 최대 해상도 제한
        const maxWidth = 2000;
        const maxHeight = 2000;

        if (img.width > maxWidth || img.height > maxHeight) {
          toast.error(`이미지 해상도는 ${maxWidth}x${maxHeight} 이하여야 합니다.`);
          URL.revokeObjectURL(objectUrl);
          e.target.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          handleOptionChange(index, "image", reader.result as string);
        };
        reader.readAsDataURL(file);
        URL.revokeObjectURL(objectUrl);
      };

      img.onerror = () => {
        toast.error('이미지를 불러올 수 없습니다.');
        URL.revokeObjectURL(objectUrl);
        e.target.value = '';
      };

      img.src = objectUrl;
    }
  }, [handleOptionChange]);

  const validateStep1 = () => {
    if (!voteType) {
      toast.error("투표 타입을 선택해주세요");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!title.trim()) {
      toast.error("투표 제목을 입력해주세요");
      return false;
    }
    if (!category) {
      toast.error("카테고리를 선택해주세요");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    try {
      if (voteType === "ox") {
        // O/X 투표는 자동으로 옵션 생성
        const oxOptions = [
          { id: "ox-o", text: "O", emoji: "", votes: 0 },
          { id: "ox-x", text: "X", emoji: "", votes: 0 },
        ];
        const voteData = {
          type: voteType,
          title,
          description,
          category,
          options: oxOptions,
        };
        onCreateVote(voteData);
      } else {
        if (options.some((opt) => !opt.text.trim())) {
          toast.error("모든 선택지를 입력해주세요");
          return;
        }

        const voteData = {
          type: voteType,
          title,
          description,
          category,
          options: options.map((opt, idx) => ({
            id: `opt-${Date.now()}-${idx}`,
            text: opt.text,
            emoji: opt.emoji,
            image: opt.image,
            votes: 0,
          })),
        };
        onCreateVote(voteData);
      }

      // Success/error toasts are handled by parent component (App.tsx)
      handleReset();
      onClose();
    } catch (error) {
      console.error("Failed to create vote:", error);
      toast.error("투표 생성에 실패했습니다.");
    }
  };

  const handleReset = () => {
    setStep(1);
    setTitle("");
    setDescription("");
    setCategory("");
    setVoteType("balance");
    setOptions([
      { text: "", emoji: "" },
      { text: "", emoji: "" },
    ]);
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      if (voteType === "ox") {
        handleSubmit();
      } else {
        setStep(3);
      }
    }
  };

  const handleBack = () => {
    setStep(Math.max(1, step - 1));
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleReset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1f2e] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-lg">
            <Sparkles className="w-5 h-5 text-lime-500" />새 투표 만들기
          </DialogTitle>
          <DialogDescription className="sr-only">
            투표 생성을 위한 3단계 프로세스: 타입 선택, 기본 정보 입력, 선택지
            설정
          </DialogDescription>
          <div className="relative h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
            {/* Background gradient (full bar) */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 opacity-20" />

            {/* Progress gradient */}
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 transition-all duration-500 ease-out ${
                voteType === "ox" && step === 2 ? "w-2/3" : ""
              }`}
              style={{
                width:
                  voteType === "ox" && step === 2
                    ? "66.666%"
                    : `${(step / 3) * 100}%`,
              }}
            />
          </div>
          <p className="text-xs mt-1">
            {step === 1 && (
              <span className="text-emerald-400">1단계: 투표 타입 선택</span>
            )}
            {step === 2 && (
              <span className="text-lime-400">2단계: 기본 정보 입력</span>
            )}
            {step === 3 && (
              <span className="text-teal-400">3단계: 선택지 설정</span>
            )}
          </p>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Step 1: Vote Type Selection */}
          {step === 1 && (
            <div className="space-y-3">
              <Label className="text-white text-sm">
                투표 타입을 선택하세요
              </Label>
              <div className="grid gap-2">
                {voteTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setVoteType(type.value)}
                    className={`p-3 rounded-lg border-2 transition-all text-left group hover:scale-[1.01] ${
                      voteType === type.value
                        ? "border-lime-500 bg-lime-500/10 shadow-lg shadow-lime-500/20"
                        : "border-white/10 hover:border-lime-500/50 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{type.emoji}</div>
                      <div className="flex-1">
                        <div className="text-white text-sm mb-0.5">
                          {type.label}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                      {voteType === type.value && (
                        <div className="w-5 h-5 rounded-full bg-lime-500 flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-black"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Basic Info */}
          {step === 2 && (
            <div className="space-y-3">
              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-white text-sm">
                  투표 제목 *
                </Label>
                <Input
                  id="title"
                  placeholder="예: 평생 떡볶이만 먹기 vs 평생 햄버거만 먹기"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-lime-500/50 h-9"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground mt-0.5">
                  {title.length}/100
                </p>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-white text-sm">
                  설명 (선택)
                </Label>
                <Textarea
                  id="description"
                  placeholder="투표에 대한 추가 설명"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-lime-500/50 text-sm"
                  rows={2}
                  maxLength={200}
                />
              </div>

              {/* Category */}
              <div>
                <Label className="text-white text-sm mb-1.5 block">
                  카테고리 *
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`p-2 rounded-lg border transition-all ${
                        category === cat.value
                          ? "border-lime-500 bg-lime-500/10"
                          : "border-white/10 hover:border-lime-500/50 bg-white/5"
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg mb-0.5">{cat.emoji}</div>
                        <div className="text-xs text-white">{cat.value}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Options */}
          {step === 3 && voteType !== "ox" && (
            <div className="space-y-2">
              <Label className="text-white text-sm">선택지 설정 *</Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <VoteOptionItem
                    key={index}
                    option={option}
                    index={index}
                    canRemove={options.length > 2 && voteType !== "balance"}
                    onOptionChange={handleOptionChange}
                    onRemove={handleRemoveOption}
                    onImageUpload={handleImageUpload}
                    emojiSuggestions={emojiSuggestions}
                  />
                ))}
              </div>

              {options.length < 5 && voteType !== "balance" && (
                <Button
                  variant="outline"
                  onClick={handleAddOption}
                  className="w-full gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-lime-500/50 h-8 text-sm"
                >
                  <Plus className="w-3 h-3" />
                  선택지 추가 ({options.length}/5)
                </Button>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gradient-to-r from-lime-500/10 to-emerald-500/10 rounded-lg p-2.5 border border-lime-500/20">
            <div className="flex items-start gap-2">
              <div className="text-base">💡</div>
              <div className="text-xs space-y-0.5">
                <p className="text-white">
                  • 투표 생성 시{" "}
                  <strong className="text-lime-500">+10 포인트</strong>
                </p>
                <p className="text-muted-foreground">
                  • 일일 남은 포인트 획득 가능 횟수:{" "}
                  <strong className="text-lime-500">{createRemaining}/5</strong>
                </p>
                <p className="text-muted-foreground text-[10px]">
                  ※ 포인트 획득 횟수 초과 시에도 투표 생성은 가능합니다
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-9 text-sm"
              >
                이전
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-9 text-sm"
            >
              취소
            </Button>
            <Button
              onClick={
                step === 3 || (step === 2 && voteType === "ox")
                  ? handleSubmit
                  : handleNext
              }
              className="flex-1 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-black border-0 h-9 text-sm"
            >
              {step === 3 || (step === 2 && voteType === "ox")
                ? "투표 생성하기"
                : "다음"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
