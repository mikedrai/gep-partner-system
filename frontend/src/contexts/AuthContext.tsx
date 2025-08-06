import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../config/supabase.ts';

interface User {
  email: string;
  role: 'admin' | 'manager' | 'partner';
  name?: string;
  id: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to determine user role based on email
  const getUserRole = (email: string): 'admin' | 'manager' | 'partner' => {
    if (email.includes('admin')) return 'admin';
    if (email.includes('partner')) return 'partner';
    return 'manager';
  };

  // Function to get user name from email
  const getUserName = (email: string): string => {
    return email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          role: getUserRole(session.user.email!),
          name: getUserName(session.user.email!)
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            role: getUserRole(session.user.email!),
            name: getUserName(session.user.email!)
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Fallback for demo accounts when Supabase auth fails
        const demoAccounts = [
          { email: 'admin@gephellas.com', password: 'GEPAdmin2024!' },
          { email: 'partner.danezis@gephellas.com', password: 'PartnerDemo2024!' },
          { email: 'manager@gephellas.com', password: 'Manager2024!' }
        ];

        const demoAccount = demoAccounts.find(acc => acc.email === email && acc.password === password);
        
        if (demoAccount) {
          // Simulate successful auth for demo accounts
          setUser({
            id: `demo-${Date.now()}`,
            email: email,
            role: getUserRole(email),
            name: getUserName(email)
          });
          return { success: true };
        }

        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      // Additional fallback for network errors
      const demoAccounts = [
        { email: 'admin@gephellas.com', password: 'GEPAdmin2024!' },
        { email: 'partner.danezis@gephellas.com', password: 'PartnerDemo2024!' },
        { email: 'manager@gephellas.com', password: 'Manager2024!' }
      ];

      const demoAccount = demoAccounts.find(acc => acc.email === email && acc.password === password);
      
      if (demoAccount) {
        // Simulate successful auth for demo accounts
        setUser({
          id: `demo-${Date.now()}`,
          email: email,
          role: getUserRole(email),
          name: getUserName(email)
        });
        return { success: true };
      }

      return { success: false, error: 'Authentication service unavailable. Please try demo accounts.' };
    }
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: user !== null,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};