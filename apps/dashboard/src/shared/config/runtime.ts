interface RuntimeConfig {
  apiUrl: string;
}

declare global {
  interface Window {
    __EUL_CONFIG__?: Partial<RuntimeConfig>;
  }
}

/** Read once at start-up from public/config.js (no secrets ever go here). */
export const runtimeConfig: RuntimeConfig = {
  apiUrl: window.__EUL_CONFIG__?.apiUrl ?? 'http://localhost:8080',
};
