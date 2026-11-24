import React, { createContext, useState, useContext, useEffect } from 'react';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      setIsLoadingPublicSettings(true);
      setIsLoadingAuth(true);
      setAuthError(null);

      try {
        // Use appParams for appId and token
        const publicSettings = { id: appParams.appId, public_settings: {} };
        setAppPublicSettings(publicSettings);

        if (appParams.token) {
          // Simulate fetching current user
          const demoUser = { id: 1, name: "Demo User" };
          setUser(demoUser);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (_error) {
        setAuthError({ type: "unknown", message: "Failed to load app state" });
        setIsAuthenticated(false);
      } finally {
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    };

    initializeApp();
  }, []);

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    // Clear token and redirect to login page
    setUser(null);
    setIsAuthenticated(false);
    // Optional: window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};