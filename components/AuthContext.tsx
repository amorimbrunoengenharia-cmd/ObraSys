"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carrega o usuário do localStorage apenas após a hidratação no client
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (!parsedUser.id) {
            // Sessão antiga sem ID: força relogin
            localStorage.removeItem('user');
            document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "userEmail=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            setUser(null);
        } else {
            setUser(parsedUser);
            // Recriar os cookies para garantir que o Servidor saiba que a sessão ainda existe
            document.cookie = `userRole=${encodeURIComponent(parsedUser.role)}; path=/`;
            document.cookie = `userEmail=${encodeURIComponent(parsedUser.email)}; path=/`;
        }
      } catch (error) {
        console.error('Erro ao parsear usuário salvo:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    // Set cookies for Server Components to read
    document.cookie = `userRole=${encodeURIComponent(userData.role)}; path=/`;
    document.cookie = `userEmail=${encodeURIComponent(userData.email)}; path=/`;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    // Clear cookies
    document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "userEmail=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During SSR, the AuthProvider may not be mounted yet.
    // Return a safe "loading" state instead of crashing.
    return { user: null, login: () => {}, logout: () => {}, isLoading: true } as AuthContextType;
  }
  return context;
}