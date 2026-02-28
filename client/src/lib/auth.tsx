import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiRequest, queryClient } from "./queryClient";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  proxyType?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("proxyform_token"));
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const stored = localStorage.getItem("proxyform_token");
    if (!stored) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${stored}` },
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setToken(stored);
      } else {
        localStorage.removeItem("proxyform_token");
        setToken(null);
        setUser(null);
      }
    } catch {
      localStorage.removeItem("proxyform_token");
      setToken(null);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    localStorage.setItem("proxyform_token", data.token);
    setToken(data.token);
    setUser(data.user);
    queryClient.clear();
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/register", { name, email, password });
    const data = await res.json();
    localStorage.setItem("proxyform_token", data.token);
    setToken(data.token);
    setUser(data.user);
    queryClient.clear();
  };

  const logout = () => {
    localStorage.removeItem("proxyform_token");
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
