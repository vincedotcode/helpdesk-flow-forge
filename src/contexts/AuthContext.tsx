
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, setAuthToken } from '@/integrations/supabase/client';

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

// Create the context with a default value
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
      console.log('Checking auth with token:', token ? 'present' : 'missing');
      
      if (!token) {
        console.log('No auth token found');
        setLoading(false);
        return;
      }

      // Set the auth token for Supabase requests
      setAuthToken(token);

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

      console.log('Session check result:', { data, error });

      if (error || !data || new Date(data.expires_at) < new Date()) {
        console.log('Session invalid or expired');
        cookieUtils.remove('auth_token');
        setAuthToken(null);
        setLoading(false);
        return;
      }

      console.log('Setting user:', data.users);
      setUser(data.users as User);
    } catch (error) {
      console.error('Auth check error:', error);
      cookieUtils.remove('auth_token');
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);
      
      // Use the authenticate_user database function
      const { data, error } = await supabase.rpc('authenticate_user', {
        user_email: email,
        user_password: password
      });
      
      console.log('Login RPC result:', { data, error });

      if (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Invalid credentials' };
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const userData = data[0];
        console.log('User data received:', userData);
        
        const sessionToken = generateSessionToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        // Create session
        const { error: sessionError } = await supabase.from('user_sessions').insert({
          user_id: userData.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString()
        });

        if (sessionError) {
          console.error('Session creation error:', sessionError);
          return { success: false, error: 'Failed to create session' };
        }

        cookieUtils.set('auth_token', sessionToken, { expires: 7 });
        setAuthToken(sessionToken);
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
      // Use the register_user database function
      const { data, error } = await supabase.rpc('register_user', {
        user_email: userData.email,
        user_password: userData.password,
        user_first_name: userData.first_name,
        user_last_name: userData.last_name
      });
      
      console.log('Signup RPC result:', { data, error });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0];
        if (result.success) {
          return { success: true };
        } else {
          return { success: false, error: result.message };
        }
      }

      return { success: false, error: 'Registration failed' };
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
      setAuthToken(null);
      setUser(null);
    }
  };

  const generateSessionToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const contextValue: AuthContextType = {
    user,
    login,
    logout,
    signup,
    loading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
