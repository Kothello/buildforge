import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiRequest, queryClient } from "./queryClient";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  active: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      await refreshUser();
      setIsLoading(false);
    };
    initAuth();
  }, [refreshUser]);

  // Check for remember me token on mount
  useEffect(() => {
    const rememberMeEmail = localStorage.getItem("rememberMeEmail");
    if (rememberMeEmail && !user) {
      // Remember me email is stored, but user isn't logged in yet
      // This is just for form prefill - actual session is checked above
    }
  }, []);

  const login = async (email: string, password: string, rememberMe?: boolean) => {
    const response = await apiRequest("POST", "/api/auth/login", { email, password, rememberMe });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }
    setUser(data.user);
    
    // Handle remember me - store email for form prefill
    if (rememberMe) {
      localStorage.setItem("rememberMeEmail", email);
    } else {
      localStorage.removeItem("rememberMeEmail");
    }
    
    queryClient.invalidateQueries();
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
    localStorage.removeItem("rememberMeEmail");
    queryClient.clear();
  };

  const register = async (name: string, email: string, password: string, role: string = "REP") => {
    const response = await apiRequest("POST", "/api/auth/register", { name, email, password, role });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Registration failed");
    }
    setUser(data.user);
    queryClient.invalidateQueries();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
