import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { AdminApp } from './admin/AdminApp';
import { navigate } from './lib/navigation';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function RootRouter() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);

    const legacyRoute = window.location.hash.match(/^#\/(admin|experience-detail\/\d+)$/)?.[1];
    if (legacyRoute) {
      navigate(`/${legacyRoute}`, { replace: true });
    }

    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (pathname.startsWith('/admin')) {
    return <AdminApp />;
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RootRouter />
    </QueryClientProvider>
  </React.StrictMode>,
);
