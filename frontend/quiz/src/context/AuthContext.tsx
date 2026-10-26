import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import type { AuthUser } from "../utilities/interfaces";
import AuthModal from "../components/Auth/AuthModal";

export interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  token: string | null;
  getAccessTokenSilently: () => Promise<string>;
  loginWithRedirect: (options?: unknown) => Promise<void>;
  logout: (options?: unknown) => Promise<void>;
  openAuthModal: (mode?: "login" | "signup") => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapSupabaseUser = (session: Session | null): AuthUser | null => {
  if (!session?.user) return null;
  const supaUser = session.user;
  const meta = supaUser.user_metadata || {};

  return {
    sub: supaUser.id,
    id: supaUser.id,
    email: supaUser.email,
    name:
      meta.name ||
      meta.full_name ||
      supaUser.email?.split("@")[0] ||
      "Användare",
    nickname:
      meta.username ||
      meta.nickname ||
      supaUser.email?.split("@")[0] ||
      "anvandare",
    picture: meta.avatar_url || meta.picture || undefined,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    let mounted = true;

    // Fetch initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        setUser(mapSupabaseUser(session));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error getting initial session:", err);
        if (mounted) setIsLoading(false);
      });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(mapSupabaseUser(session));
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = useCallback((mode: "login" | "signup" = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const loginWithRedirect = useCallback(async () => {
    openAuthModal("login");
  }, [openAuthModal]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }, []);

  const getAccessTokenSilently = useCallback(async (): Promise<string> => {
    if (session?.access_token) {
      return session.access_token;
    }

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession?.access_token) {
      throw new Error("Ingen aktiv Supabase-session hittades");
    }

    return currentSession.access_token;
  }, [session]);

  const value: AuthContextType = {
    isAuthenticated: Boolean(session?.user),
    user,
    isLoading,
    token: session?.access_token || null,
    getAccessTokenSilently,
    loginWithRedirect,
    logout,
    openAuthModal,
    closeAuthModal,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authModalMode}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

