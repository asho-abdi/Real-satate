import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { LayoutProvider } from './context/LayoutContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <LayoutProvider>
              <NotificationProvider>
                <App />
                <Toaster
                  position="top-right"
                  gutter={10}
                  containerStyle={{ top: 76 }}
                  toastOptions={{
                    duration: 3500,
                    style: {
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-pop)',
                      padding: '10px 14px',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      maxWidth: '380px',
                    },
                    success: { iconTheme: { primary: '#0e8a5f', secondary: '#ffffff' } },
                    error: { iconTheme: { primary: '#d03a47', secondary: '#ffffff' }, duration: 5000 },
                    loading: { iconTheme: { primary: '#f5a900', secondary: 'rgba(245,169,0,0.2)' } },
                  }}
                />
              </NotificationProvider>
            </LayoutProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
