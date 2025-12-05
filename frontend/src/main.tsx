import { createRoot } from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";
import App from "./App.tsx";
import "./index.css";

const cognitoAuthConfig = {
  // Cognito User Pool OIDC Issuer
  authority: `https://cognito-idp.${import.meta.env.VITE_COGNITO_REGION}.amazonaws.com/${import.meta.env.VITE_COGNITO_USER_POOL_ID}`,

  // Cognito App Client ID
  client_id: import.meta.env.VITE_COGNITO_CLIENT_ID,

  // Redirect after login
  redirect_uri: `${window.location.origin}/auth/callback`,

  // Redirect after logout
  post_logout_redirect_uri: window.location.origin,

  // OAuth2 response type
  response_type: "code",

  // OIDC scopes
  scope: "openid email profile",

  // Automatic silent renew (refresh token)
  automaticSilentRenew: true,

  // Store tokens in sessionStorage (more secure than localStorage)
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),

  // Handle successful signin
  onSigninCallback: () => {
    // Redirect to home after successful login
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

createRoot(document.getElementById("root")!).render(
  <AuthProvider {...cognitoAuthConfig}>
    <App />
  </AuthProvider>
);