
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'super_admin' | 'department_admin' | 'department_technician' | 'end_user';
  department_id?: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  signup: (userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Cookie utilities using localStorage as fallback
const cookieUtils = {
  get: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`cookie_${name}`);
  },
  set: (name: string, value: string, options?: { expires?: number }): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`cookie_${name}`, value);
    // For expires, we could implement expiration logic, but for simplicity we'll just store it
    if (options?.expires) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + options.expires);
      localStorage.setItem(`cookie_${name}_expires`, expiryDate.toISOString());
    }
  },
  remove: (name: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`cookie_${name}`);
    localStorage.removeItem(`cookie_${name}_expires`);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = cookieUtils.get('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          user_id,
          expires_at,
          users!inner(
            id,
            email,
            first_name,
            last_name,
            role,
            department_id,
            is_active
          )
        `)
        .eq('session_token', token)
        .single();

      if (error || !data || new Date(data.expires_at) < new Date()) {
        cookieUtils.remove('auth_token');
        setLoading(false);
        return;
      }

      setUser(data.users as User);
    } catch (error) {
      console.error('Auth check error:', error);
      cookieUtils.remove('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Use any type for RPC call to bypass TypeScript strict checking
      const result = await (supabase as any).rpc('authenticate_user', {
        user_email: email,
        user_password: password
      });
      
      const { data, error } = result as { data: User[] | null; error: any };

      if (error) {
        return { success: false, error: 'Invalid credentials' };
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const userData = data[0];
        const sessionToken = generateSessionToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        // Create session
        await supabase.from('user_sessions').insert({
          user_id: userData.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString()
        });

        cookieUtils.set('auth_token', sessionToken, { expires: 7 });
        setUser(userData);
        return { success: true };
      }

      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const signup = async (userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => {
    try {
      // Use any type for RPC call to bypass TypeScript strict checking
      const result = await (supabase as any).rpc('register_user', {
        user_email: userData.email,
        user_password: userData.password,
        user_first_name: userData.first_name,
        user_last_name: userData.last_name
      });
      
      const { data, error } = result as { data: any; error: any };

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      const token = cookieUtils.get('auth_token');
      if (token) {
        await supabase.from('user_sessions').delete().eq('session_token', token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      cookieUtils.remove('auth_token');
      setUser(null);
    }
  };

  const generateSessionToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
