import React, { createContext, useContext, useState, useEffect } from 'react';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [, setPendingCredentials] = useState<{email: string, password: string} | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const fetchUser = async (authToken: string): Promise<User> => {
    const userResponse = await fetch('http://localhost:8000/api/auth/profile/', {
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
      const response = await fetch('http://localhost:8000/api/auth/login/', {
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
