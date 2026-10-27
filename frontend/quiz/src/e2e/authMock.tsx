import type { PropsWithChildren } from "react";

const testUser = {
  sub: "supabase|bdd-test-user",
  id: "supabase|bdd-test-user",
  email: "bdd@example.test",
  name: "BDD Test User",
  nickname: "bdd-user",
};

const getAccessTokenSilently = async () => "bdd-test-token";

export function AuthProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}

export function useAuth() {
  return {
    isAuthenticated: true,
    isLoading: false,
    user: testUser,
    token: "bdd-test-token",
    getAccessTokenSilently,
    loginWithRedirect: async () => undefined,
    logout: async () => undefined,
    openAuthModal: () => undefined,
    closeAuthModal: () => undefined,
  };
}
