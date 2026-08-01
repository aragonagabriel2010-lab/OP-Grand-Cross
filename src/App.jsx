import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import Home from "@/pages/Home";
import Story from "@/pages/Story";
import StoryArc from "@/pages/StoryArc";
import Battle from "@/pages/Battle";
import Gacha from "@/pages/Gacha";
import Characters from "@/pages/Characters";
import CharacterDetail from "@/pages/CharacterDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import UiSfxBridge from "@/components/game/UiSfxBridge";

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0b161b]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/story"
        element={
          <ProtectedRoute>
            <Story />
          </ProtectedRoute>
        }
      />
      <Route
        path="/story/:arcId"
        element={
          <ProtectedRoute>
            <StoryArc />
          </ProtectedRoute>
        }
      />
      <Route
        path="/battle/:chapterNumber"
        element={
          <ProtectedRoute>
            <Battle />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gacha"
        element={
          <ProtectedRoute>
            <Gacha />
          </ProtectedRoute>
        }
      />
      <Route
        path="/characters"
        element={
          <ProtectedRoute>
            <Characters />
          </ProtectedRoute>
        }
      />
      <Route path="/crew" element={<Navigate to="/characters" replace />} />
      <Route
        path="/character/locked/:characterId"
        element={
          <ProtectedRoute>
            <CharacterDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/character/:ownedId"
        element={
          <ProtectedRoute>
            <CharacterDetail />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <UiSfxBridge />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
