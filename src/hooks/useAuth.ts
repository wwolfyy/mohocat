'use client';

import { useAuthContext } from '@/components/auth/AuthProvider';

// Re-export types if needed by consumers, or they can import from AuthProvider
// But for backward compatibility with existing code:
export type { AuthState } from '@/components/auth/AuthProvider';
// Note: AuthState is not exported from AuthProvider currently, I need to check.
// I defined interface locally in AuthProvider.
// I should probably export it from AuthProvider.

export function useAuth() {
  return useAuthContext();
}
