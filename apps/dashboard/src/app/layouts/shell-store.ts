import { create } from 'zustand';

/** Small UI state for the shell only. */
export const useShell = create<{
  collapsed: boolean; // desktop: icons-only sidebar
  mobileOpen: boolean; // small screens: sidebar in a sheet
  searchOpen: boolean; // command menu (Ctrl/⌘ K)
  toggleCollapsed: () => void;
  setMobileOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
}>((set) => ({
  collapsed: false,
  mobileOpen: false,
  searchOpen: false,
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
}));
