import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  1000 * 60 * 2,   // 2 min
      retry:      1,
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '14px',
              borderRadius: '10px',
              padding: '12px 16px'
            },
            success: { iconTheme: { primary: '#2f9e44', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#e03131', secondary: '#fff' } }
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
