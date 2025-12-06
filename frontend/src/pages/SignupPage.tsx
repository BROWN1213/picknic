import { useState, useRef, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { SchoolSelector } from "../components/SchoolSelector";
import { apiClient } from "../lib/api";
import { Vote, ArrowLeft, ArrowRight, Camera, X, Loader2, Check, User, Sparkles, Mail, Lock, UserCircle, Search } from "lucide-react";
import { toast } from "sonner";

interface SignupPageProps {
    email: string;
    providerId: string;
    onSignupSuccess: (user: any) => void;
    onBackToLogin?: () => void;
    mode?: 'signup' | 'complete-profile'; // 추가
}

const INTERESTS_LIST = ["아이돌", "게임", "음식", "패션", "스포츠", "영화", "음악", "공부", "연애", "학교생활"];

// 비밀번호 강도 계산
const calculatePasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: "없음", color: "bg-gray-400" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { strength: 20, label: "약함", color: "bg-red-500" };
    if (score <= 2) return { strength: 40, label: "보통", color: "bg-orange-500" };
    if (score <= 3) return { strength: 60, label: "양호", color: "bg-yellow-500" };
    if (score <= 4) return { strength: 80, label: "강함", color: "bg-lime-500" };
    return { strength: 100, label: "매우 강함", color: "bg-emerald-500" };
};

// 이메일 유효성 검증
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export function SignupPage({
    email: initialEmail,
    providerId,
    onSignupSuccess,
    onBackToLogin,
    mode = 'signup'
}: SignupPageProps) {
    const isOAuthSignup = providerId && providerId !== "local";

    // OAuth 회원가입이면 step 2부터 시작 (이메일/비밀번호 입력 건너뛰기)
    const [step, setStep] = useState(isOAuthSignup ? 2 : 1);
    const [formData, setFormData] = useState({
        email: initialEmail || "",
        password: "",
        passwordConfirm: "",
        nickname: "",
        gender: "",
        birthYear: "",
        schoolName: "",
        interests: [] as string[],
        studentName: "", // For verification
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
    const [verificationMessage, setVerificationMessage] = useState<string>('');
    const [errors, setErrors] = useState({
        email: "",
        password: "",
        passwordConfirm: "",
        nickname: "",
    });
    const [touched, setTouched] = useState({
        email: false,
        password: false,
        passwordConfirm: false,
        nickname: false,
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 실시간 검증
    useEffect(() => {
        if (!touched.email) return;
        if (!formData.email) {
            setErrors(prev => ({ ...prev, email: "이메일을 입력해주세요." }));
        } else if (!isValidEmail(formData.email)) {
            setErrors(prev => ({ ...prev, email: "올바른 이메일 형식이 아닙니다." }));
        } else {
            setErrors(prev => ({ ...prev, email: "" }));
        }
    }, [formData.email, touched.email]);

    useEffect(() => {
        if (!touched.password) return;
        if (!formData.password) {
            setErrors(prev => ({ ...prev, password: "비밀번호를 입력해주세요." }));
        } else if (formData.password.length < 8) {
            setErrors(prev => ({ ...prev, password: "비밀번호는 최소 8자 이상이어야 합니다." }));
        } else {
            setErrors(prev => ({ ...prev, password: "" }));
        }
    }, [formData.password, touched.password]);

    useEffect(() => {
        if (!touched.passwordConfirm) return;
        if (!formData.passwordConfirm) {
            setErrors(prev => ({ ...prev, passwordConfirm: "비밀번호를 다시 입력해주세요." }));
        } else if (formData.password !== formData.passwordConfirm) {
            setErrors(prev => ({ ...prev, passwordConfirm: "비밀번호가 일치하지 않습니다." }));
        } else {
            setErrors(prev => ({ ...prev, passwordConfirm: "" }));
        }
    }, [formData.password, formData.passwordConfirm, touched.passwordConfirm]);

    useEffect(() => {
        if (!touched.nickname) return;
        if (!formData.nickname) {
            setErrors(prev => ({ ...prev, nickname: "닉네임을 입력해주세요." }));
        } else if (formData.nickname.length < 2) {
            setErrors(prev => ({ ...prev, nickname: "닉네임은 최소 2자 이상이어야 합니다." }));
        } else if (formData.nickname.length > 20) {
            setErrors(prev => ({ ...prev, nickname: "닉네임은 20자 이하여야 합니다." }));
        } else {
            setErrors(prev => ({ ...prev, nickname: "" }));
        }
    }, [formData.nickname, touched.nickname]);

    const passwordStrength = calculatePasswordStrength(formData.password);

    const handleBlur = (field: keyof typeof touched) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.size > 5 * 1024 * 1024) {
                toast.error("파일 크기는 5MB 이하여야 합니다.");
                return;
            }
            if (!file.type.startsWith('image/')) {
                toast.error("이미지 파일만 업로드 가능합니다.");
                return;
            }
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleInterestToggle = (interest: string) => {
        setFormData(prev => {
            if (prev.interests.includes(interest)) {
                return { ...prev, interests: prev.interests.filter(i => i !== interest) };
            } else {
                if (prev.interests.length >= 5) return prev; // Max 5
                return { ...prev, interests: [...prev.interests, interest] };
            }
        });
    };

    const verifyStudentCard = async (file: File) => {
        if (!formData.schoolName) {
            toast.error("먼저 학교를 선택해주세요.");
            return;
        }
        if (!formData.studentName) {
            toast.error("먼저 이름을 입력해주세요.");
            return;
        }

        setIsVerifying(true);
        setVerificationStatus('verifying');
        setVerificationMessage('학생증을 인증하는 중입니다...');

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('file', file);
            formDataToSend.append('schoolName', formData.schoolName);
            formDataToSend.append('studentName', formData.studentName);

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/auth/verify-student-card`, {
                method: 'POST',
                body: formDataToSend,
            });

            const result = await response.json();

            if (result.verified) {
                setVerificationStatus('success');
                setVerificationMessage(result.message);
                toast.success(result.message);
            } else {
                setVerificationStatus('failed');
                setVerificationMessage(result.message);
                toast.error(result.message);
            }
        } catch (error: any) {
            setVerificationStatus('failed');
            setVerificationMessage('학생증 인증 중 오류가 발생했습니다.');
            toast.error('학생증 인증 중 오류가 발생했습니다.');
            console.error('Verification error:', error);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("파일 크기는 5MB 이하여야 합니다.");
                return;
            }
            if (!file.type.startsWith('image/')) {
                toast.error("이미지 파일만 업로드 가능합니다.");
                return;
            }
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setVerificationStatus('idle');
            setVerificationMessage('');
            toast.success("이미지가 업로드되었습니다. '인증하기' 버튼을 눌러주세요.");
        }
    };

    const handleRemoveFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFile(null);
        setPreviewUrl(null);
        setVerificationStatus('idle');
        setVerificationMessage('');
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            if (isOAuthSignup) {
                // OAuth user completing profile → UPDATE existing user
                const payload = {
                    nickname: formData.nickname,
                    gender: formData.gender,
                    birthYear: parseInt(formData.birthYear),
                    schoolName: formData.schoolName,
                    interests: formData.interests
                };
                await apiClient.post("/auth/complete-profile", payload);

                // Fetch updated profile to get profileCompleted: true
                const profileResponse: any = await apiClient.get("/users/me");
                const updatedProfile = profileResponse.data; // Extract data from ApiResponse wrapper
                onSignupSuccess(updatedProfile);
            } else {
                // Local user registration → CREATE new user
                const payload = {
                    email: formData.email,
                    password: formData.password,
                    nickname: formData.nickname,
                    gender: formData.gender,
                    birthYear: parseInt(formData.birthYear),
                    schoolName: formData.schoolName,
                    interests: formData.interests,
                    providerId: "local"
                };
                const user = await apiClient.post("/auth/register", payload);
                onSignupSuccess(user);
            }
        } catch (error: any) {
            const errorMessage = error.response?.message || error.message || "회원가입 중 오류가 발생했습니다.";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = () => {
        if (step === 1) {
            // Step 1 검증
            const hasErrors = errors.email || errors.password || errors.passwordConfirm;
            const isComplete = formData.email && formData.password && formData.passwordConfirm;

            if (!isComplete || hasErrors) {
                setTouched({
                    email: true,
                    password: true,
                    passwordConfirm: true,
                    nickname: false,
                });
                toast.error("모든 필드를 올바르게 입력해주세요.");
                return;
            }
        }
        if (step === 2) {
            // Step 2 검증
            const hasErrors = errors.nickname;
            const isComplete = formData.nickname && formData.gender && formData.birthYear;

            if (!isComplete || hasErrors) {
                setTouched({
                    email: false,
                    password: false,
                    passwordConfirm: false,
                    nickname: true,
                });
                toast.error("모든 필드를 올바르게 입력해주세요.");
                return;
            }
        }
        setStep(prev => prev + 1);
    };

    const prevStep = () => {
        // OAuth users should not go back to Step 1
        if (isOAuthSignup && step === 2) return;
        setStep(prev => prev - 1);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden selection:bg-lime-500/30 p-4">
            {/* Dynamic Background Effects */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-lime-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

            {/* Footer Background Image */}
            <div className="absolute bottom-0 left-0 w-full h-[50vh] z-0 pointer-events-none">
                <img
                    src="/footer-bg.png"
                    alt="Background"
                    className="w-full h-full object-cover opacity-40"
                    style={{ maskImage: 'linear-gradient(to top, black, transparent)' }}
                />
            </div>

            <div className={`w-full max-w-lg relative z-10 transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <Card className="bg-[#121212]/80 backdrop-blur-2xl text-white shadow-2xl rounded-3xl overflow-hidden border-0">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                        <div
                            className="h-full bg-gradient-to-r from-lime-500 to-emerald-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(132,204,22,0.5)]"
                            style={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>

                    <CardHeader className="space-y-4 pt-6 px-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-lime-500/20">
                                    <Vote className="w-5 h-5 text-black" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Picknic</h2>
                                    <p className="text-[10px] text-white/50 font-medium">회원가입</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {[1, 2, 3].map((s) => (
                                    <div
                                        key={s}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${step >= s ? "bg-lime-500 scale-110 shadow-[0_0_8px_rgba(132,204,22,0.5)]" : "bg-white/10"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-0.5">
                            <CardTitle className="text-2xl font-bold">
                                {step === 1 && "기본 정보 입력"}
                                {step === 2 && "나만의 프로필"}
                                {step === 3 && "학교 인증"}
                            </CardTitle>
                            <CardDescription className="text-white/60 text-sm">
                                {step === 1 && "로그인에 사용할 정보를 입력해주세요."}
                                {step === 2 && "친구들에게 보여질 정보를 설정해주세요."}
                                {step === 3 && "안전한 커뮤니티를 위해 학생증 인증이 필요합니다."}
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 pt-2">
                        {step === 1 && (
                            <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* 이메일 필드 */}
                                <div>
                                    <Label htmlFor="email" className="text-white/80 flex items-center gap-1.5 text-sm mb-1.5">
                                        <Mail className="w-3.5 h-3.5 text-lime-500" />
                                        이메일
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        onBlur={() => handleBlur('email')}
                                        className={`h-11 bg-white/5 border text-white placeholder:text-white/20 rounded-lg focus:border-lime-500/50 focus:ring-lime-500/20 transition-all text-sm ${errors.email && touched.email ? 'border-red-500/50' : 'border-white/10'
                                            }`}
                                        disabled={!!initialEmail}
                                    />
                                    <div className="min-h-[20px] mt-1">
                                        {touched.email && errors.email && (
                                            <p className="text-[11px] text-red-400">
                                                {errors.email}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* 비밀번호 필드 */}
                                <div>
                                    <Label htmlFor="password" className="text-white/80 flex items-center gap-1.5 text-sm mb-1.5">
                                        <Lock className="w-3.5 h-3.5 text-lime-500" />
                                        비밀번호
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        onBlur={() => handleBlur('password')}
                                        className={`h-11 bg-white/5 border text-white placeholder:text-white/20 rounded-lg focus:border-lime-500/50 focus:ring-lime-500/20 transition-all text-sm ${errors.password && touched.password ? 'border-red-500/50' : 'border-white/10'
                                            }`}
                                    />
                                    <div className="min-h-[44px] mt-1">
                                        {touched.password && errors.password ? (
                                            <p className="text-[11px] text-red-400">
                                                {errors.password}
                                            </p>
                                        ) : formData.password && !errors.password ? (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-white/60">비밀번호 강도</span>
                                                    <span className={`font-medium ${passwordStrength.strength >= 80 ? 'text-lime-500' :
                                                            passwordStrength.strength >= 60 ? 'text-yellow-500' :
                                                                passwordStrength.strength >= 40 ? 'text-orange-500' : 'text-red-500'
                                                        }`}>
                                                        {passwordStrength.label}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${passwordStrength.color} transition-all duration-500`}
                                                        style={{ width: `${passwordStrength.strength}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                {/* 비밀번호 확인 필드 */}
                                <div>
                                    <Label htmlFor="passwordConfirm" className="text-white/80 flex items-center gap-1.5 text-sm mb-1.5">
                                        <Lock className="w-3.5 h-3.5 text-lime-500" />
                                        비밀번호 확인
                                    </Label>
                                    <Input
                                        id="passwordConfirm"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.passwordConfirm}
                                        onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                                        onBlur={() => handleBlur('passwordConfirm')}
                                        className={`h-11 bg-white/5 border text-white placeholder:text-white/20 rounded-lg focus:border-lime-500/50 focus:ring-lime-500/20 transition-all text-sm ${errors.passwordConfirm && touched.passwordConfirm ? 'border-red-500/50' : 'border-white/10'
                                            }`}
                                    />
                                    <div className="min-h-[20px] mt-1">
                                        {touched.passwordConfirm && errors.passwordConfirm && (
                                            <p className="text-[11px] text-red-400">
                                                {errors.passwordConfirm}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-11 bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-500 hover:to-emerald-600 text-black font-bold text-base rounded-lg mt-4 transition-all shadow-lg shadow-lime-500/20 hover:shadow-lime-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                    onClick={nextStep}
                                    disabled={!formData.email || !formData.password || !formData.passwordConfirm || !!errors.email || !!errors.password || !!errors.passwordConfirm}
                                >
                                    다음 단계로
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>

                                {/* Back to Login Link */}
                                {onBackToLogin && (
                                    <div className="mt-6 text-center">
                                        <p className="text-white/40 text-sm">
                                            이미 계정이 있으신가요?{" "}
                                            <button
                                                onClick={onBackToLogin}
                                                className="text-lime-400 hover:text-lime-300 font-semibold hover:underline transition-all ml-1"
                                            >
                                                로그인
                                            </button>
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* 닉네임 필드 */}
                                <div>
                                    <Label htmlFor="nickname" className="text-white/80 flex items-center gap-1.5 justify-between text-sm mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <UserCircle className="w-3.5 h-3.5 text-lime-500" />
                                            닉네임
                                        </span>
                                        <span className="text-[11px] text-white/40">{formData.nickname.length}/20</span>
                                    </Label>
                                    <Input
                                        id="nickname"
                                        placeholder="사용할 닉네임을 입력하세요"
                                        value={formData.nickname}
                                        onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                                        onBlur={() => handleBlur('nickname')}
                                        maxLength={20}
                                        className={`h-11 bg-white/5 border text-white placeholder:text-white/20 rounded-lg focus:border-lime-500/50 focus:ring-lime-500/20 transition-all text-sm ${errors.nickname && touched.nickname ? 'border-red-500/50' : 'border-white/10'
                                            }`}
                                    />
                                    <div className="min-h-[20px] mt-1">
                                        {touched.nickname && errors.nickname && (
                                            <p className="text-[11px] text-red-400">
                                                {errors.nickname}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-white/80 text-sm">성별</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setFormData({ ...formData, gender: "MALE" })}
                                                className={`h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${formData.gender === "MALE"
                                                    ? "border-lime-500 bg-lime-500/10 text-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.2)]"
                                                    : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:border-white/20"
                                                    }`}
                                            >
                                                <User className="w-5 h-5" />
                                                <span className="font-medium text-sm">남성</span>
                                            </button>
                                            <button
                                                onClick={() => setFormData({ ...formData, gender: "FEMALE" })}
                                                className={`h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${formData.gender === "FEMALE"
                                                    ? "border-lime-500 bg-lime-500/10 text-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.2)]"
                                                    : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:border-white/20"
                                                    }`}
                                            >
                                                <User className="w-5 h-5" />
                                                <span className="font-medium text-sm">여성</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-white/80 text-sm">출생년도</Label>
                                        <Select onValueChange={(val) => setFormData({ ...formData, birthYear: val })} value={formData.birthYear}>
                                            <SelectTrigger className="h-20 bg-white/5 border-white/10 text-white text-base rounded-lg focus:ring-lime-500/20">
                                                <SelectValue placeholder="선택" />
                                            </SelectTrigger>
                                            <SelectContent position="popper" side="bottom" align="start" sideOffset={4} avoidCollisions={false} className="bg-black border-white/50 text-white max-h-[300px] z-50">
                                                {Array.from({ length: 6 }, (_, i) => 2012 - i).map(year => (
                                                    <SelectItem key={year} value={String(year)} className="focus:bg-lime-500/50 focus:text-lime-400 cursor-pointer hover:bg-lime-500/30">
                                                        {year}년
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-white/80 flex items-center justify-between text-sm">
                                        <span>관심사 (최대 5개)</span>
                                        <span className="text-[11px] text-lime-500">{formData.interests.length}/5 선택됨</span>
                                    </Label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {INTERESTS_LIST.map(interest => (
                                            <button
                                                key={interest}
                                                onClick={() => handleInterestToggle(interest)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${formData.interests.includes(interest)
                                                    ? "bg-gradient-to-r from-lime-500 to-emerald-500 text-black shadow-lg shadow-lime-500/20 scale-105"
                                                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                                                    }`}
                                            >
                                                {interest}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-11 border-white/10 bg-white/5 hover:bg-white/10 text-white hover:text-white rounded-lg text-sm"
                                        onClick={prevStep}
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                                        이전
                                    </Button>
                                    <Button
                                        className="flex-1 h-11 bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-500 hover:to-emerald-600 text-black font-bold rounded-lg transition-all shadow-lg shadow-lime-500/20 hover:shadow-lime-500/40 hover:scale-[1.02] active:scale-[0.98] text-sm"
                                        onClick={nextStep}
                                        disabled={!formData.nickname || !formData.gender || !formData.birthYear || !!errors.nickname}
                                    >
                                        다음 단계로
                                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                    </Button>
                                </div>

                                {/* Back to Login Link */}
                                {onBackToLogin && (
                                    <div className="mt-6 text-center">
                                        <p className="text-white/40 text-sm">
                                            이미 계정이 있으신가요?{" "}
                                            <button
                                                onClick={onBackToLogin}
                                                className="text-lime-400 hover:text-lime-300 font-semibold hover:underline transition-all ml-1"
                                            >
                                                로그인
                                            </button>
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-3">
                                    <SchoolSelector
                                        value={formData.schoolName}
                                        onChange={(schoolName) => setFormData({ ...formData, schoolName })}
                                    />
                                    <div className="space-y-1.5">
                                        <Label className="text-white/80 text-sm">이름</Label>
                                        <Input
                                            placeholder="본명을 입력해주세요"
                                            value={formData.studentName}
                                            onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                                            className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-lg focus:border-lime-500/50 focus:ring-lime-500/20 transition-all text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-white/80 flex items-center gap-1.5 text-sm">
                                                <Camera className="w-3.5 h-3.5 text-lime-500" />
                                                학생증 촬영/업로드
                                            </Label>
                                            <span className="text-[10px] text-lime-400 font-medium bg-lime-500/10 px-2 py-0.5 rounded-full border border-lime-500/20">필수</span>
                                        </div>
                                        <div
                                            className={`relative group w-full h-44 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden flex flex-col items-center justify-center
                                              ${isDragging
                                                    ? 'border-lime-500 bg-lime-500/10 scale-[1.02]'
                                                    : previewUrl
                                                        ? 'border-lime-500/50 bg-black/40'
                                                        : 'border-white/10 bg-white/5 hover:border-lime-500/30 hover:bg-white/10'
                                                }`}
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragEnter={handleDragEnter}
                                            onDragLeave={handleDragLeave}
                                            onDragOver={handleDragOver}
                                            onDrop={handleDrop}
                                        >
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileSelect}
                                            />

                                            {isDragging ? (
                                                <div className="flex flex-col items-center justify-center text-center p-6">
                                                    <div className="w-20 h-20 rounded-full bg-lime-500/20 flex items-center justify-center mb-4 animate-pulse">
                                                        <Camera className="w-10 h-10 text-lime-400" />
                                                    </div>
                                                    <p className="text-lg font-bold text-lime-400">
                                                        여기에 이미지를 놓으세요
                                                    </p>
                                                    <p className="text-sm text-white/60 mt-2">
                                                        파일이 업로드됩니다
                                                    </p>
                                                </div>
                                            ) : previewUrl ? (
                                                <>
                                                    <img
                                                        src={previewUrl}
                                                        alt="Preview"
                                                        className="w-full h-full object-contain p-2"
                                                    />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Camera className="w-8 h-8 text-white" />
                                                            <p className="text-white font-medium">이미지 변경하기</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={handleRemoveFile}
                                                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 text-white hover:bg-red-500 transition-all flex items-center justify-center z-20 backdrop-blur-sm hover:scale-110"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                    <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                                                        <Check className="w-4 h-4 text-lime-400" />
                                                        <span className="text-xs text-white font-medium">업로드 완료</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-center p-6">
                                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-lime-500/10 transition-all duration-300">
                                                        <Camera className="w-8 h-8 text-white/40 group-hover:text-lime-400 transition-colors" />
                                                    </div>
                                                    <p className="text-base font-medium text-white group-hover:text-lime-400 transition-colors">
                                                        여기를 클릭하여 학생증 업로드
                                                    </p>
                                                    <p className="text-sm text-white/40 mt-2">
                                                        또는 이미지를 여기로 끌어다 놓으세요
                                                    </p>
                                                    <p className="text-xs text-white/30 mt-3 flex items-center gap-1">
                                                        <span>JPG, PNG</span>
                                                        <span>•</span>
                                                        <span>최대 5MB</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-lime-500" />
                                            학교명과 성명이 빛 반사 없이 선명하게 보이도록 촬영해주세요.
                                        </p>
                                    </div>

                                    {/* Verification Button & Status */}
                                    {selectedFile && (
                                        <div className="space-y-3">
                                            <Button
                                                onClick={() => verifyStudentCard(selectedFile)}
                                                disabled={isVerifying || verificationStatus === 'success'}
                                                className={`w-full h-12 rounded-lg transition-all ${
                                                    verificationStatus === 'success'
                                                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                                        : verificationStatus === 'failed'
                                                        ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
                                                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white'
                                                }`}
                                            >
                                                {isVerifying ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                        인증 중...
                                                    </>
                                                ) : verificationStatus === 'success' ? (
                                                    <>
                                                        <Check className="w-5 h-5 mr-2" />
                                                        인증 완료
                                                    </>
                                                ) : verificationStatus === 'failed' ? (
                                                    <>
                                                        <X className="w-5 h-5 mr-2" />
                                                        다시 인증하기
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-5 h-5 mr-2" />
                                                        학생증 인증하기
                                                    </>
                                                )}
                                            </Button>

                                            {/* Verification Result Card */}
                                            {verificationStatus !== 'idle' && (
                                                <div className={`p-4 rounded-xl border-2 transition-all ${
                                                    verificationStatus === 'success'
                                                        ? 'border-emerald-500 bg-emerald-500/10'
                                                        : verificationStatus === 'failed'
                                                        ? 'border-red-500 bg-red-500/10'
                                                        : 'border-blue-500 bg-blue-500/10'
                                                }`}>
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                            verificationStatus === 'success'
                                                                ? 'bg-emerald-500'
                                                                : verificationStatus === 'failed'
                                                                ? 'bg-red-500'
                                                                : 'bg-blue-500'
                                                        }`}>
                                                            {verificationStatus === 'verifying' && <Loader2 className="w-5 h-5 text-white animate-spin" />}
                                                            {verificationStatus === 'success' && <Check className="w-5 h-5 text-white" />}
                                                            {verificationStatus === 'failed' && <X className="w-5 h-5 text-white" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className={`font-bold text-sm mb-1 ${
                                                                verificationStatus === 'success'
                                                                    ? 'text-emerald-400'
                                                                    : verificationStatus === 'failed'
                                                                    ? 'text-red-400'
                                                                    : 'text-blue-400'
                                                            }`}>
                                                                {verificationStatus === 'verifying' && '인증 진행 중'}
                                                                {verificationStatus === 'success' && '인증 성공'}
                                                                {verificationStatus === 'failed' && '인증 실패'}
                                                            </h4>
                                                            <p className="text-xs text-white/80">
                                                                {verificationMessage}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-14 border-white/10 bg-white/5 hover:bg-white/10 text-white hover:text-white rounded-xl"
                                        onClick={prevStep}
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        이전
                                    </Button>
                                    <Button
                                        className="flex-1 h-14 bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-500 hover:to-emerald-600 text-black font-bold rounded-xl transition-all shadow-lg shadow-lime-500/20 hover:shadow-lime-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                        onClick={handleSubmit}
                                        disabled={isLoading || !formData.schoolName || !formData.studentName || !selectedFile || verificationStatus !== 'success'}
                                    >
                                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                            <span className="flex items-center gap-2">
                                                인증 완료하기
                                                <Check className="w-5 h-5" />
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
