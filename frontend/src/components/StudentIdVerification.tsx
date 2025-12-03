import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { School, Upload, CheckCircle2, ScanLine, X, Camera } from "lucide-react";
import { toast } from "sonner";

interface StudentIdVerificationProps {
  onComplete: (schoolName: string) => void;
  onBack: () => void;
}

export function StudentIdVerification({ onComplete, onBack }: StudentIdVerificationProps) {
  const [schoolName, setSchoolName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schools = [
    "서울고등학교",
    "경기고등학교",
    "한영고등학교",
    "대원외국어고등학교",
    "중앙대학교",
    "연세대학교",
    "고려대학교",
    "서강대학교",
    "성균관대학교",
    "한양대학교",
    "이화여자대학교",
    "서울대학교",
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("파일 크기는 5MB 이하여야 합니다.");
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleVerify = async () => {
    if (!schoolName) {
      toast.error("학교를 선택해주세요");
      return;
    }
    if (!studentName) {
      toast.error("이름을 입력해주세요");
      return;
    }
    if (!selectedFile) {
      toast.error("학생증 이미지를 업로드해주세요");
      return;
    }

    setIsVerifying(true);
    
    setTimeout(() => {
        setIsVerifying(false);
        toast.success(`${schoolName} 학생 인증이 완료되었습니다! 🎉`);
        setTimeout(() => {
            onComplete(schoolName);
        }, 500);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-white/5 px-8 py-6 border-b border-white/5">
            <div className="flex items-center gap-6">
              <button 
                onClick={onBack}
                className="w-12 h-12 ml-4 rounded-xl bg-gradient-to-br from-lime-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-lime-500/20 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                title="로그인 화면으로 돌아가기"
              >
                <School className="w-6 h-6 text-black" strokeWidth={2.5} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">학생증 인증</h1>
                <p className="text-sm text-muted-foreground">
                  안전한 커뮤니티를 위해 학교 인증이 필요합니다
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Form Section */}
            <div className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="school" className="text-sm font-medium text-white ml-1">학교 선택</Label>
                <div className="relative">
                  <select
                    id="school"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full h-14 pl-4 pr-10 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all hover:bg-white/10 appearance-none"
                  >
                    <option value="" disabled style={{ backgroundColor: "#1a1a1a", color: "gray" }}>재학 중인 학교를 선택하세요</option>
                    {schools.map((school) => (
                      <option key={school} value={school} style={{ backgroundColor: "#1a1a1a", color: "white" }}>
                        {school}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <School className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-white ml-1">이름</Label>
                <Input
                  id="name"
                  placeholder="본명을 입력해주세요"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="h-14 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/50 hover:bg-white/10 transition-all focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
                />
              </div>
            </div>

            {/* ID Card Upload Section - Enhanced UX */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <Label className="text-sm font-medium text-white">학생증 촬영/업로드</Label>
                <span className="text-xs text-lime-500 font-medium">필수</span>
              </div>
              
              <div 
                className={`relative group w-full h-64 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden flex flex-col items-center justify-center
                  ${previewUrl 
                    ? 'border-lime-500/50 bg-black/40' 
                    : 'border-white/10 bg-white/5 hover:border-lime-500/30 hover:bg-white/10'
                  }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                
                {previewUrl ? (
                  <>
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-full object-contain p-2" 
                    />
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm">
                      <Camera className="w-8 h-8 text-lime-500 mb-2" />
                      <p className="text-white font-medium">다시 선택하기</p>
                    </div>
                    <button 
                      onClick={handleRemoveFile}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors flex items-center justify-center z-20 backdrop-blur-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-lime-500/10 transition-all duration-300">
                      <ScanLine className="w-10 h-10 text-muted-foreground group-hover:text-lime-500 transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-medium text-white group-hover:text-lime-500 transition-colors">
                        여기를 클릭하여 학생증 업로드
                      </p>
                      <p className="text-sm text-muted-foreground">
                        또는 이미지를 여기로 끌어다 놓으세요
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Refined Info Box */}
              <div className="flex gap-3 px-1">
                <div className="w-1 h-full min-h-[2.5rem] rounded-full bg-lime-500/50" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-lime-500 font-medium block mb-0.5">인증 팁</span>
                  학교명과 성명이 빛 반사 없이 선명하게 보이도록 촬영해주세요.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleVerify}
              disabled={!schoolName || !studentName || !selectedFile || isVerifying}
              className="w-full h-14 rounded-xl text-base font-medium bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-black border-0 shadow-lg shadow-lime-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
            >
              {isVerifying ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>인증 정보를 확인하고 있습니다...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>인증 완료하기</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
