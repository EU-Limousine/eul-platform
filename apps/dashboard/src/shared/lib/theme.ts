import { create } from 'zustand';

export type Theme = 'light' | 'dark';
const KEY = 'eul.theme';

function current(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** Light by default; dark on toggle. Remembered per browser (a UI preference, not a secret). */
export const useTheme = create<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>((set, get) => ({
  theme: typeof document === 'undefined' ? 'light' : current(),
  setTheme: (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // storage blocked: the choice lasts for this page only
    }
    set({ theme });
  },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));
