import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);
      const response = await fetch('http://localhost:8000/api/auth/token/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Login failed:', errorData);
        throw new Error('Login failed');
      }

      const data = await response.json();
      console.log('Got token:', data.auth_token ? 'yes' : 'no');
      setToken(data.auth_token);
      
      // Fetch user info
      const userResponse = await fetch('http://localhost:8000/api/auth/users/me/', {
        headers: {
          'Authorization': `Token ${data.auth_token}`,
        },
      });

      console.log('User fetch status:', userResponse.status);

      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('User data received:', userData);
        console.log('is_staff:', userData.is_staff);
        setUser(userData);
        localStorage.setItem('authToken', data.auth_token);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        console.error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
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
