import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "react-oidc-context";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Vote, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../lib/api";

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
  onNeedRegister: (email: string, providerId: string) => void;
}

export function LoginPage({ onLoginSuccess, onNeedRegister }: LoginPageProps) {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);
  const hasProcessedAuth = useRef(false);

  useEffect(() => {
    setMounted(true);
    // Reset auth processing flag on mount to allow fresh login
    hasProcessedAuth.current = false;
  }, []);

  const handleOidcLogin = useCallback(async () => {
    if (hasProcessedAuth.current) return;
    hasProcessedAuth.current = true;

    try {
      // Ensure token provider is set before making API call
      const idToken = auth.user?.id_token;

      apiClient.setTokenProvider(() => {
        return idToken || null;
      });

      const response: any = await apiClient.get("/users/me");
      const profile = response.data; // Extract data from ApiResponse wrapper

      // 프로필 완성 여부 확인
      if (!profile.profileCompleted) {
        // 프로필 미완성 → 회원가입 2단계로 이동
        const email = auth.user?.profile?.email || "";
        const providerId = auth.user?.profile?.sub || "";
        toast.info("프로필 설정을 완료해주세요.");
        onNeedRegister(email, providerId);
      } else {
        // 프로필 완성 → 로그인 성공
        onLoginSuccess(profile);
        toast.success("로그인 성공! 환영합니다.");
      }
    } catch (error: any) {
      console.error("Failed to load user profile:", error);

      // 401/404 에러 = 계정이 없음 -> 회원가입으로 이동
      if (error.status === 401 || error.status === 404) {
        const email = auth.user?.profile?.email || "";
        const providerId = auth.user?.profile?.sub || "";
        toast.info("계정이 없습니다. 회원가입을 진행해주세요.");
        onNeedRegister(email, providerId);
      } else {
        toast.error("사용자 정보를 불러오는데 실패했습니다.");
      }
    }
  }, [auth.user, onLoginSuccess, onNeedRegister]);

  useEffect(() => {
    // OIDC 인증 완료 처리
    if (auth.isAuthenticated && auth.user && !hasProcessedAuth.current) {
      handleOidcLogin();
    }

    // OIDC 에러 처리
    if (auth.error) {
      setIsGoogleLoading(false);
      toast.error("로그인 중 오류가 발생했습니다: " + auth.error.message);
    }
  }, [auth.isAuthenticated, auth.user, auth.error, handleOidcLogin]);

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response: any = await apiClient.post("/auth/login", {
        email,
        password
      });

      if (response.token) {
        localStorage.setItem("token", response.token);
      }

      const profileResponse: any = await apiClient.get("/users/me");
      const profile = profileResponse.data; // Extract data from ApiResponse wrapper
      onLoginSuccess(profile);
      toast.success("로그인 성공! 환영합니다.");

    } catch (error: any) {
      console.error("Login error:", error);

      let errorMessage = "로그인 중 오류가 발생했습니다.";

      if (error.message && error.message !== `HTTP error! status: ${error.status}`) {
        errorMessage = error.message;
      } else if (error.status === 401) {
        errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다.";
      }

      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-center',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      // Google Identity Provider로 직접 리다이렉트
      await auth.signinRedirect({
        extraQueryParams: {
          identity_provider: "Google"
        }
      });
    } catch (error) {
      console.error("Failed to redirect to Google login:", error);
      setIsGoogleLoading(false);
      toast.error("Google 로그인 시작에 실패했습니다.");
    }
  };

  const handleGoToSignup = () => {
    onNeedRegister("", "");
  };

  // OIDC 로딩 중 표시
  if (auth.isLoading || isGoogleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-lime-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
        </div>

        <div className="flex flex-col items-center relative z-10">
          {/* Logo */}
          <div className="mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 shadow-lg shadow-lime-500/30 animate-pulse flex items-center justify-center">
              <Vote className="w-9 h-9 text-black" strokeWidth={2.5} />
            </div>
          </div>

          {/* Loading Spinner */}
          <div className="relative mb-4">
            <Loader2 className="w-12 h-12 animate-spin text-lime-500" />
            <div className="absolute inset-0 w-12 h-12 bg-lime-500/20 rounded-full blur-xl animate-pulse"></div>
          </div>

          {/* Loading Text */}
          <div className="space-y-1 mb-3 text-center">
            <p className="text-white text-xl font-semibold">로그인 처리중...</p>
            <p className="text-white/50 text-sm">잠시만 기다려주세요</p>
          </div>

          {/* Loading Dots Animation */}
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-lime-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-lime-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-lime-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden selection:bg-lime-500/30">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-lime-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-teal-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '5s' }} />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      {/* Footer Background Image */}
      <div className="absolute bottom-0 left-0 w-full h-[50vh] z-0 pointer-events-none">
        <img
          src="/footer-bg.png"
          alt="Background"
          className="w-full h-full object-cover opacity-40 mask-image-linear-gradient-to-t"
          style={{ maskImage: 'linear-gradient(to top, black, transparent)' }}
        />
      </div>

      <div className={`w-full max-w-md relative z-10 transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        {/* Main Card */}
        <div className="bg-[#121212]/80 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative group">
          {/* Hover Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* Header Section */}
          <div className="text-center mb-14 relative">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 shadow-lg shadow-lime-500/20 transform group-hover:scale-110 transition-transform duration-500">
                <Vote className="w-7 h-7 text-black" strokeWidth={2.5} />
              </div>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                Picknic
              </h1>
            </div>
            <p className="text-white/60 text-base font-medium">
              친구들과 함께 Pick하는 즐거움
            </p>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleLocalLogin} className="space-y-8 relative z-10">
            <div className="space-y-6">
              <div className="group/input">
                <Input
                  id="email"
                  type="email"
                  placeholder="이메일 주소"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-16 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-2xl focus:border-lime-500/50 focus:ring-lime-500/20 transition-all group-hover/input:bg-white/10 text-lg px-6"
                  required
                />
              </div>
              <div className="group/input">
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-16 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-2xl focus:border-lime-500/50 focus:ring-lime-500/20 transition-all group-hover/input:bg-white/10 text-lg px-6"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-16 bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-500 hover:to-emerald-600 text-black font-bold text-xl rounded-2xl transition-all shadow-lg shadow-lime-500/20 hover:shadow-lime-500/40 hover:scale-[1.02] active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  로그인
                  <ArrowRight className="w-6 h-6" />
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#121212] px-4 text-white/40 font-medium tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Login Button */}
          <Button
            variant="outline"
            className="w-full h-14 bg-white text-black hover:bg-gray-100 border-0 font-semibold rounded-xl transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group/google"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-gray-700" />
                <span className="text-gray-700">Google로 이동 중...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 transition-transform group-hover/google:scale-110 duration-300" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="relative">
                  Google로 시작하기
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-lime-500/20 to-transparent -translate-x-full group-hover/google:translate-x-full transition-transform duration-700"></span>
                </span>
              </>
            )}
          </Button>

          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-white/40 text-sm">
              계정이 없으신가요?{" "}
              <button
                onClick={handleGoToSignup}
                className="text-lime-400 hover:text-lime-300 font-semibold hover:underline transition-all ml-1"
              >
                회원가입
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
