import { create } from 'zustand';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  accessToken: string | null; // memory only — never localStorage/sessionStorage
  user: SessionUser | null;
  setSession: (accessToken: string, user: SessionUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ accessToken, user }),
  clear: () => set({ accessToken: null, user: null }),
}));
