import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './serviceWorkerRegistration.ts';
import { ThemeProvider } from './context/ThemeContext.tsx';

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
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);

