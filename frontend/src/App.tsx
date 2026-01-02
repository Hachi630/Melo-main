import { ConfigProvider, App as AntApp } from "antd";
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import Dashboard from "./components/Dashboard";
import "./App.css";
import { DEFAULT_TAGLINE, MELO_LOGO } from "./constants/assets";
import BrandProfile from "./pages/BrandProfile";
import CalendarPage from "./pages/Calendar";
import Personal from "./pages/Personal";
import HomePage from "./pages/HomePage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ContactUs from "./pages/ContactUs";
import { authService, User } from "./services/authService";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { AppSettingsProvider } from "./contexts/AppSettingsContext";
import DarkModeProvider from "./components/DarkModeProvider";
import LinkedInDashboard from "./components/LinkedInDashboard";
import InstagramCallback from "./pages/InstagramCallback";

function AuthCallback({
  onLoginSuccess,
}: {
  onLoginSuccess: (user: User) => void;
}) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      authService.getCurrentUser().then((user) => {
        if (user) {
          onLoginSuccess(user);
          window.location.href = "/dashboard";
        } else {
          window.location.href = "/?error=auth_failed";
        }
      });
    } else if (error) {
      console.error("OAuth error:", error);
      window.location.href = "/?error=" + error;
    }
  }, [token, error, onLoginSuccess]);

  return <div>Processing login...</div>;
}

function AppContent() {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { message } = AntApp.useApp();

  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setIsLoggedIn(true);
          setUser(currentUser);
        } else {
          // Token invalid
          authService.logout();
          setIsLoggedIn(false);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get("error");
    if (error) {
      if (error === "google_oauth_not_configured") {
        message.error(
          "Google OAuth is not configured. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env"
        );
      } else if (error === "oauth_failed") {
        message.error("Google OAuth authentication failed. Please try again.");
      } else if (error === "no_email") {
        message.error("Unable to retrieve email from Google account.");
      } else if (error === "auth_failed") {
        message.error("Authentication failed. Please try again.");
      }
      // Clean up URL
      window.history.replaceState({}, "", location.pathname);
    }
  }, [location, message]);

  const handleLoginSuccess = (user: User) => {
    setIsLoggedIn(true);
    setUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setUser(null);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route
        path="/auth/callback"
        element={<AuthCallback onLoginSuccess={handleLoginSuccess} />}
      />
      <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
      <Route
        path="/"
        element={
          isLoggedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <HomePage
              isLoggedIn={isLoggedIn}
              onLoginSuccess={handleLoginSuccess}
              onLogout={handleLogout}
              user={user}
            />
          )
        }
      />
      <Route
        path="/home"
        element={
          <HomePage
            isLoggedIn={isLoggedIn}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
            user={user}
          />
        }
      />
      <Route
        path="/dashboard"
        element={
          <Dashboard
            isLoggedIn={isLoggedIn}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
            user={user}
            heroTitle="Where every word begins with a little melody?"
            tagline={DEFAULT_TAGLINE}
            background="light"
            headerOverrides={{
              showBrandName: false,
              logoSrc: MELO_LOGO,
            }}
          />
        }
      />
      <Route
        path="/calendar"
        element={
          <CalendarPage
            isLoggedIn={isLoggedIn}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
            user={user}
          />
        }
      />
      <Route
        path="/settings"
        element={
          <BrandProfile
            isLoggedIn={isLoggedIn}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
            user={user}
          />
        }
      />
      <Route
        path="/socialdashboard"
        element={
          <LinkedInDashboard
            isLoggedIn={isLoggedIn}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
            user={user}
            jwt={localStorage.getItem("token") || ""}
            userId={user?.id}
          />
        }
      />
      <Route
        path="/personal"
        element={
          <Personal
            isLoggedIn={isLoggedIn}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
            user={user}
          />
        }
      />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/contact-us" element={<ContactUs />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppWithTheme() {
  const { theme } = useTheme();

  const themeConfig =
    theme === "warm"
      ? {
          token: {
            fontFamily: "'ZCOOL KuaiLe', Inter, system-ui, sans-serif",
            colorBgBase: "#FAF9F4",
            colorPrimary: "#AE906E",
            colorText: "#908066",
            colorTextSecondary: "#B1A285",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(225, 219, 195, 0.3)",
          },
        }
      : {
          token: {
            fontFamily: "Inter, system-ui, sans-serif",
            colorBgBase: "#f5f5f5",
            colorPrimary: "#646cff",
            colorText: "#1e1e1e",
            colorTextSecondary: "#666666",
            borderRadius: 8,
          },
        };

  return (
    <ConfigProvider theme={themeConfig}>
      <AntApp>
        <BrowserRouter>
          <DarkModeProvider>
            <div className="app">
              <AppContent />
            </div>
          </DarkModeProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppSettingsProvider>
        <AppWithTheme />
      </AppSettingsProvider>
    </ThemeProvider>
  );
}

export default App;
