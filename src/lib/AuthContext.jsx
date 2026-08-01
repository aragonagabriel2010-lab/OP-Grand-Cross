import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import {
  isFirebaseConfigured,
  subscribeAuth,
  mapFirebaseUser,
  loginEmailPassword,
  registerEmailPassword,
  loginGoogle,
  logoutFirebase,
  auth,
} from "@/lib/firebase";
import { bindAuthUser, unbindAuthUser } from "@/lib/localDb";

const AuthContext = createContext();

function isRegisteredUser(fbUser) {
  return Boolean(fbUser && !fbUser.isAnonymous);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [firebaseReady] = useState(isFirebaseConfigured);
  const [saveReady, setSaveReady] = useState(false);

  const applyUser = useCallback(async (mapped) => {
    setUser(mapped);
    setIsAuthenticated(!!mapped);
    setAuthChecked(true);
    setSaveReady(false);
    try {
      if (mapped) await bindAuthUser(mapped);
      else await unbindAuthUser();
    } finally {
      setSaveReady(true);
      setIsLoadingAuth(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const current = auth?.currentUser;
    if (isRegisteredUser(current)) {
      await applyUser(mapFirebaseUser(current));
      return;
    }
    await applyUser(null);
  }, [applyUser]);

  useEffect(() => {
    setAppPublicSettings({
      id: firebaseReady ? "firebase" : "unconfigured",
      public_settings: { auth_required: true },
    });
    setIsLoadingPublicSettings(false);

    if (!firebaseReady) {
      applyUser(null);
      return undefined;
    }

    const unsub = subscribeAuth((fbUser) => {
      if (fbUser?.isAnonymous) {
        logoutFirebase().finally(() => applyUser(null));
        return;
      }
      applyUser(mapFirebaseUser(fbUser));
    });
    return unsub;
  }, [firebaseReady, applyUser]);

  const login = async (email, password) => {
    const u = await loginEmailPassword(email, password);
    await applyUser(u);
    return u;
  };

  const register = async (email, password, displayName) => {
    const u = await registerEmailPassword(email, password, displayName);
    await applyUser(u);
    return u;
  };

  const loginWithGoogle = async () => {
    const u = await loginGoogle();
    await applyUser(u);
    return u;
  };

  const logout = async () => {
    if (firebaseReady) {
      await logoutFirebase();
    }
    await applyUser(null);
  };

  const navigateToLogin = () => {
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        firebaseReady,
        saveReady,
        logout,
        navigateToLogin,
        refreshUser,
        login,
        register,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
