'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { getAuthService } from '@/services';

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const authService = getAuthService();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((authUser: User | null) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authService]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
}
