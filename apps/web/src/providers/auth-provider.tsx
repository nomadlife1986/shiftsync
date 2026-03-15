'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { LOGIN } from '../lib/graphql/mutations';
import { apolloClient } from '../lib/apollo-client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  phone?: string;
  skills?: string[];
  desiredWeeklyHours?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const [loginMutation] = useMutation(LOGIN);

  useEffect(() => {
    const storedToken = localStorage.getItem('shiftsync_token');
    const storedUser = localStorage.getItem('shiftsync_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Re-sync cookies in case they expired (localStorage persists longer)
        document.cookie = `shiftsync_token=${storedToken}; path=/; max-age=604800; SameSite=Lax`;
        const role = JSON.parse(storedUser).role;
        document.cookie = `shiftsync_role=${role}; path=/; max-age=604800; SameSite=Lax`;
      } catch {
        localStorage.removeItem('shiftsync_token');
        localStorage.removeItem('shiftsync_user');
        document.cookie = 'shiftsync_token=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'shiftsync_role=; path=/; max-age=0; SameSite=Lax';
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await loginMutation({ variables: { email, password } });
      if (data?.login) {
        const { accessToken, userId, role, email: userEmail, firstName, lastName } = data.login;
        const loggedInUser: User = { id: userId, email: userEmail, firstName, lastName, role };
        setToken(accessToken);
        setUser(loggedInUser);
        localStorage.setItem('shiftsync_token', accessToken);
        localStorage.setItem('shiftsync_user', JSON.stringify(loggedInUser));
        // Cookies let middleware protect routes server-side (7d expiry)
        document.cookie = `shiftsync_token=${accessToken}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `shiftsync_role=${role}; path=/; max-age=604800; SameSite=Lax`;
      }
    },
    [loginMutation],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('shiftsync_token');
    localStorage.removeItem('shiftsync_user');
    // Clear cookies
    document.cookie = 'shiftsync_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'shiftsync_role=; path=/; max-age=0; SameSite=Lax';
    apolloClient.clearStore();
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
