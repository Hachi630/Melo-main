import { useEffect } from "react";
import { useDarkreader } from "react-darkreader";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useLocation } from "react-router-dom";

// Check if current page is an entry page
const isEntryPage = (): boolean => {
  const entryPagePaths = [
    "/home",
    "/privacy-policy",
    "/terms-of-service",
    "/contact-us",
    "/",
  ];
  const pathname = window.location.pathname;
  return entryPagePaths.some(
    (path) =>
      pathname === path ||
      pathname === path + "/" ||
      pathname.startsWith("/home")
  );
};

export default function DarkModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings } = useAppSettings();
  const location = useLocation();

  // Only enable dark mode if not on entry pages
  const shouldEnableDarkMode = settings.darkMode && !isEntryPage();

  const [isDark, { toggle }] = useDarkreader(shouldEnableDarkMode, {
    brightness: 100,
    contrast: 100,
    sepia: 0,
  });

  // Sync dark mode state with settings - immediate sync
  useEffect(() => {
    // Immediately toggle if state doesn't match
    if (shouldEnableDarkMode !== isDark) {
      toggle();
    }
  }, [shouldEnableDarkMode, isDark, toggle]);

  // Handle route changes
  useEffect(() => {
    const isEntry = isEntryPage();
    if (isEntry && isDark) {
      toggle();
    } else if (!isEntry && settings.darkMode && !isDark) {
      toggle();
    }
  }, [location.pathname, settings.darkMode, isDark, toggle]);

  return <>{children}</>;
}
