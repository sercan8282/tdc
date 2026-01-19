import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiUrl } from '../config/api';

interface User {
  id: number;
  email: string;
  nickname: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_verified: boolean;
  mfa_enabled: boolean;
}

interface LoginResult {
  mfa_required?: boolean;
  mfa_setup_required?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<LoginResult | undefined>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to safely get initial values from localStorage
const getInitialToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

const getInitialUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
  }
  return null;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize state directly from localStorage to prevent flash of unauthenticated content
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [token, setToken] = useState<string | null>(getInitialToken);
  const [, setPendingCredentials] = useState<{email: string, password: string} | null>(null);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      const savedToken = localStorage.getItem('authToken');
      if (savedToken) {
        try {
          const response = await fetch(getApiUrl('/api/auth/profile/'), {
            headers: {
              'Authorization': `Token ${savedToken}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setToken(savedToken);
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            // Token is invalid, clear everything
            console.log('Token invalid, logging out');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            setUser(null);
            setToken(null);
          }
        } catch (error) {
          console.error('Failed to validate token:', error);
          // Keep the user logged in if it's just a network error
        }
      }
    };

    validateToken();
  }, []);

  const fetchUser = async (authToken: string): Promise<User> => {
    const userResponse = await fetch(getApiUrl('/api/auth/profile/'), {
      headers: {
        'Authorization': `Token ${authToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data');
    }

    return await userResponse.json();
  };

  const refreshUser = async () => {
    if (!token) return;
    
    try {
      const userData = await fetchUser(token);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const login = async (email: string, password: string, mfaCode?: string): Promise<LoginResult | undefined> => {
    try {
      console.log('Attempting login for:', email);
      
      // Use our custom login endpoint that supports MFA
      const response = await fetch(getApiUrl('/api/auth/login/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          ...(mfaCode && { mfa_code: mfaCode })
        }),
      });

      console.log('Login response status:', response.status);
      
      const data = await response.json();
      
      if (!response.ok) {
        // Check for specific error messages
        if (data.error) {
          throw new Error(data.error);
        }
        throw new Error('Login failed');
      }

      // Check if MFA is required
      if (data.mfa_required) {
        setPendingCredentials({ email, password });
        return { mfa_required: true };
      }

      // Successful login
      const authToken = data.token;
      console.log('Got token:', authToken ? 'yes' : 'no');
      
      setToken(authToken);
      setPendingCredentials(null);
      
      // Fetch user info
      const userData = await fetchUser(authToken);
      console.log('User data received:', userData);
      setUser(userData);
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('user', JSON.stringify(userData));

      // Check if MFA setup is required (user doesn't have MFA enabled yet)
      if (!userData.mfa_enabled) {
        return { mfa_setup_required: true };
      }

      return undefined;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPendingCredentials(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isAdmin: user?.is_staff || false,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
