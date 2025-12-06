# Google OAuth (AWS Cognito) 설정 가이드

## 📋 개요

Picknic은 Google OAuth 인증을 AWS Cognito를 통해 구현합니다.
- **프론트엔드**: `react-oidc-context` 라이브러리 사용 (OIDC 표준)
- **백엔드**: Cognito ID Token 검증 및 사용자 자동 생성
- **인증 플로우**: Authorization Code Flow with PKCE

---

## 🔐 현재 OAuth 플로우

### 1. 로그인 플로우
```
[사용자]
  ↓ (1) "Google로 시작하기" 버튼 클릭
[Frontend - LoginPage.tsx]
  ↓ (2) auth.signinRedirect() 호출
[Cognito]
  ↓ (3) Google OAuth 페이지로 리다이렉트
[Google]
  ↓ (4) 사용자 인증 후 authorization code 반환
[Cognito]
  ↓ (5) /auth/callback으로 리다이렉트 (code 포함)
[Frontend - react-oidc-context]
  ↓ (6) code를 ID token으로 자동 교환
[Frontend - LoginPage.tsx]
  ↓ (7) ID token을 Authorization header에 포함하여 /users/me 호출
[Backend - JwtAuthenticationFilter]
  ↓ (8) Cognito ID token 검증
[Backend - OAuthUserService]
  ↓ (9) 사용자 자동 생성 또는 조회
[Frontend - LoginPage.tsx]
  ↓ (10) 프로필 완성 여부 확인
      - 완성됨: 로그인 완료
      - 미완성: 회원가입 2단계(프로필 입력)로 이동
```

### 2. 로그아웃 플로우
```
[사용자]
  ↓ (1) "로그아웃" 버튼 클릭
[Frontend - App.tsx handleLogout]
  ↓ (2) localStorage 토큰 제거
  ↓ (3) auth.removeUser() - 로컬 OIDC 세션 제거
  ↓ (4) Cognito logout URL 수동 생성
      형식: https://{domain}/logout?client_id={client_id}&logout_uri={logout_uri}
  ↓ (5) window.location.href로 Cognito logout 페이지 리다이렉트
[Cognito]
  ↓ (6) Cognito 세션 종료
  ↓ (7) logout_uri로 리다이렉트 (루트 페이지)
[Frontend]
  ↓ (8) 로그인 페이지로 이동
```

**참고**: `auth.signoutRedirect()` 대신 수동으로 Cognito logout URL을 구성하는 이유:
- `signoutRedirect()`가 Cognito의 OIDC discovery에서 잘못된 엔드포인트(`/login`)를 가져오는 문제가 있음
- 올바른 Cognito logout 엔드포인트는 `/logout`임
- 수동 구성으로 정확한 로그아웃 처리 보장

---

## ⚙️ AWS Cognito 설정 체크리스트

### ❗ 로그아웃 리다이렉트 문제 해결

**이전 증상**: 로그아웃 시 `/login` 엔드포인트로 리다이렉트되며 400 에러 발생

**원인**: `react-oidc-context`의 `signoutRedirect()`가 Cognito OIDC discovery에서 잘못된 엔드포인트를 가져옴

**해결 방법**: ✅ 코드에서 이미 수정됨 (수동으로 Cognito logout URL 구성)

---

### AWS Cognito 설정 확인 (필수)

로그아웃이 정상 작동하려면 다음 설정을 확인해야 합니다:

1. **AWS Cognito 콘솔 접속**
   - [AWS Cognito Console](https://console.aws.amazon.com/cognito)로 이동
   - User Pool: `ap-northeast-2_GXyqgCSgc` 선택

2. **App client 설정 확인**
   - 좌측 메뉴: "App integration" → "App clients" 클릭
   - App client: `1ehrrjikkri1vf3uo74fnbkf85` 선택
   - "Edit hosted UI" 버튼 클릭

3. **Allowed sign-out URLs 설정**
   다음 URL들을 모두 추가:

   ```
   http://localhost:5173
   http://localhost:3000
   https://picknic-rho.vercel.app
   ```

   ⚠️ **중요**:
   - 각 URL 끝에 `/`를 붙이지 마세요!
   - 이 URL들은 Cognito logout 후 리다이렉트될 수 있는 주소들입니다

4. **Allowed callback URLs 확인**
   다음 URL들이 있는지 확인 (로그인용):

   ```
   http://localhost:5173/auth/callback
   http://localhost:3000/auth/callback
   https://picknic-rho.vercel.app/auth/callback
   ```

5. **변경사항 저장**
   - "Save changes" 버튼 클릭
   - 설정 변경은 즉시 반영됨 (재배포 불필요)

---

## 🔧 환경변수 설정

### Frontend (.env)
```env
# AWS Cognito Configuration (OIDC)
VITE_COGNITO_REGION=ap-northeast-2
VITE_COGNITO_USER_POOL_ID=ap-northeast-2_GXyqgCSgc
VITE_COGNITO_CLIENT_ID=1ehrrjikkri1vf3uo74fnbkf85
VITE_COGNITO_DOMAIN=ap-northeast-2gxyqgcsgc.auth.ap-northeast-2.amazoncognito.com

# Development
VITE_COGNITO_REDIRECT_URI=http://localhost:5173/auth/callback

# Production (프로덕션 배포 시 변경)
# VITE_COGNITO_REDIRECT_URI=https://picknic-rho.vercel.app/auth/callback
```

**중요**: `VITE_COGNITO_DOMAIN`은 로그아웃 URL 구성에 필요합니다.

### Backend (.env)
```env
# AWS Cognito 설정 (백엔드는 ID token 검증용으로만 사용)
COGNITO_USER_POOL_ID=ap-northeast-2_GXyqgCSgc
COGNITO_CLIENT_ID=1ehrrjikkri1vf3uo74fnbkf85
COGNITO_REGION=ap-northeast-2
COGNITO_DOMAIN=ap-northeast-2gxyqgcsgc.auth.ap-northeast-2.amazoncognito.com
OAUTH_CALLBACK_URL=http://localhost:5173/auth/callback
```

---

## 📂 주요 파일 구조

### Frontend
```
frontend/src/
├── main.tsx                    # OIDC 설정 (AuthProvider)
├── App.tsx                     # 로그아웃 처리 (handleLogout)
└── pages/
    └── LoginPage.tsx          # 로그인 처리 (Google OAuth 버튼)
```

### Backend
```
backend/src/main/java/com/picknic/backend/
├── config/
│   ├── JwtAuthenticationFilter.java    # Cognito ID token 검증
│   └── SecurityConfig.java              # Spring Security 설정
├── service/
│   ├── OAuthUserService.java           # OAuth 사용자 자동 생성
│   └── CognitoService.java             # (사용 안 함 - 예비용)
└── util/
    └── CognitoTokenValidator.java      # Cognito JWT 검증
```

---

## 🐛 트러블슈팅

### 1. 로그아웃 시 `/login` 엔드포인트로 가며 400 에러 발생
**증상**: 로그아웃 시 다음과 같은 URL로 리다이렉트:
```
https://ap-northeast-2gxyqgcsgc.auth.ap-northeast-2.amazoncognito.com/login?id_token_hint=...&post_logout_redirect_uri=...
```

**원인**: `auth.signoutRedirect()`가 Cognito의 OIDC discovery에서 잘못된 엔드포인트를 가져옴

**해결**: ✅ 이미 수정됨 - `App.tsx`에서 수동으로 Cognito logout URL을 구성하도록 변경

### 2. 로그아웃 후 "Allowed sign-out URL" 에러
**증상**: Cognito 에러 페이지에 "The provided sign-out URL is not allowed" 메시지 표시

**해결**: AWS Cognito Console에서 "Allowed sign-out URLs" 설정 확인 (위의 섹션 참고)

### 3. 로그인 후 "프로필 설정을 완료해주세요" 무한 루프
**원인**: OAuth 사용자 자동 생성 후 프로필 완성 체크 로직 문제

**확인**:
- `JwtAuthenticationFilter.java:52-57` - 사용자 자동 생성 확인
- `OAuthUserService.java:98-100` - 프로필 완성 체크 로직 확인

### 4. Cognito ID token 검증 실패
**확인**:
- `CognitoTokenValidator` 설정 확인
- Cognito User Pool ID 및 Region이 올바른지 확인
- ID token 만료 여부 확인 (기본 1시간)

### 5. Google OAuth 리다이렉트 실패
**확인**:
- Cognito의 "Allowed callback URLs"에 현재 환경의 URL이 포함되어 있는지 확인
- Google Cloud Console의 "Authorized redirect URIs"에 Cognito callback URL이 포함되어 있는지 확인
  - 형식: `https://<cognito-domain>/oauth2/idpresponse`

---

## 📚 참고 문서

- [react-oidc-context](https://github.com/authts/react-oidc-context)
- [AWS Cognito - Hosted UI](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-integration.html)
- [OIDC Authorization Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth)

---

## ✅ 리팩토링 완료 사항

### 2024년 12월 리팩토링
- ✅ **로그아웃 버그 수정**: `/login` 엔드포인트 400 에러 문제 해결
  - `auth.signoutRedirect()` 대신 수동으로 Cognito logout URL 구성
  - 올바른 `/logout` 엔드포인트 사용
- ✅ Deprecated OAuth 코드 제거:
  - `AuthController.handleCognitoCallback()` 제거
  - `AuthService.handleOAuthCallback()` 제거
  - `CognitoService` 의존성 정리
- ✅ OAuth 플로우 명확화 및 문서화
- ✅ 코드 주석 추가로 가독성 향상
- ✅ 환경변수 추가: `VITE_COGNITO_DOMAIN`

### 현재 OAuth 구조의 장점
1. **프론트엔드 중심 OAuth**: 서버 리다이렉트 없이 빠른 로그인
2. **자동 사용자 생성**: 첫 로그인 시 자동으로 계정 생성
3. **2단계 프로필 완성**: 필수 정보만 먼저 받고, 나머지는 나중에 입력
4. **토큰 보안**: sessionStorage 사용으로 XSS 위험 감소

---

## 🚀 다음 단계 (선택사항)

1. **Refresh Token 자동 갱신**: `automaticSilentRenew: true` 이미 활성화됨
2. **로그아웃 후 자동 로그인 방지**: 현재 구현으로 해결됨
3. **프로필 사진 OAuth에서 가져오기**: Google profile picture URL 활용 고려
4. **다중 OAuth Provider 지원**: Kakao, Naver 등 추가 고려

---

마지막 업데이트: 2024년
작성자: Claude Code
