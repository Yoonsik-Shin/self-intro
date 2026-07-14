import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { AdminApp } from './admin/AdminApp';
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
  const [isAdminRoute, setIsAdminRoute] = useState(() => window.location.hash.startsWith('#/admin'));

  useEffect(() => {
    const onHashChange = () => setIsAdminRoute(window.location.hash.startsWith('#/admin'));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return isAdminRoute ? <AdminApp /> : <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RootRouter />
    </QueryClientProvider>
  </React.StrictMode>,
);
