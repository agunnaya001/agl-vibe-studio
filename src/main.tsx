import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './serviceWorkerRegistration.ts';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { wagmiConfig } from './lib/wagmi.ts';

const queryClient = new QueryClient();

// Register Service Worker for asset caching & offline capability
registerServiceWorker(
  (status) => {
    console.log("[SW Status]", status);
  },
  () => {
    console.log("[SW] Device switched to OFFLINE mode");
  },
  () => {
    console.log("[SW] Device switched back ONLINE");
  }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);


