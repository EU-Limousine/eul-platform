import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/700.css';
import '@/styles/index.css';
import '@/shared/lib/i18n';
import { setupHttp } from '@/features/auth/session';
import { Providers, queryClient } from './app/providers';
import { router } from './app/router';

setupHttp(() => {
  queryClient.clear();
  void router.navigate({ to: '/login' });
});

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

createRoot(root).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
