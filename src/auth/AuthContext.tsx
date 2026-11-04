import { useQueryClient } from "@tanstack/react-query";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api } from "../api/api";
import { refreshSession, session } from "../api/client";
import type { User } from "../api/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    session.clear();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  useEffect(() => {
    session.onExpired(logout);
    (async () => {
      if (session.hasRefreshToken() && (await refreshSession())) {
        setUser(await api.me().catch(() => null));
      }
      setLoading(false);
    })();
  }, [logout]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => setUser(await api.login(email, password)),
      register: async (email, password) => setUser(await api.register(email, password)),
      logout,
    }),
    [user, loading, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
