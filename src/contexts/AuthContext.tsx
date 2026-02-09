import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  company: {
    id: string;
    name: string;
    code: string;
    cnpj?: string;
    sector: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string, companyCode: string) => Promise<void>;
  register: (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    company: { name: string; cnpj: string; sector: string };
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('lume_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authApi.me()
        .then((res) => {
          const data = res.data.data || res.data;
          // getMe retorna user com company incluída
          setUser(data);
        })
        .catch(() => {
          localStorage.removeItem('lume_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (username: string, password: string, companyCode: string) => {
    // Garantir que companyCode está em uppercase (o backend é case-sensitive)
    const res = await authApi.login({ username, password, companyCode: companyCode.toUpperCase().trim() });
    const data = res.data.data || res.data;
    // Backend retorna { token, user: {...}, company: {...} } separados
    const { token: newToken, user: userData, company } = data;
    localStorage.setItem('lume_token', newToken);
    setToken(newToken);
    // Montar o user com company embutida
    setUser({ ...userData, company });
  };

  const register = async (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    company: { name: string; cnpj: string; sector: string };
  }) => {
    const res = await authApi.register(data);
    const resData = res.data.data || res.data;
    // Backend retorna { token, user: {...}, company: {...} } separados
    const { token: newToken, user: userData, company } = resData;
    localStorage.setItem('lume_token', newToken);
    setToken(newToken);
    // Montar o user com company embutida
    setUser({ ...userData, company });
  };

  const logout = () => {
    localStorage.removeItem('lume_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
