import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface AppSettings {
  fontSize: number;
  fontFamily: string;
  accentColor: string;
  darkMode: boolean;
}

interface AppSettingsContextType {
  settings: AppSettings;
  pendingSettings: AppSettings;
  updatePendingSettings: (newSettings: Partial<AppSettings>) => void;
  applySettings: () => void;
  resetSettings: () => void;
  resetPendingSettings: () => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(
  undefined
);

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 14,
  fontFamily: "Inter, system-ui, sans-serif",
  accentColor: "#bacf65",
  darkMode: false,
};

const STORAGE_KEY = "melo_app_settings";

// Helper function to calculate text color based on background
const getContrastColor = (bgColor: string): string => {
  if (!bgColor || typeof bgColor !== "string") {
    return "#1e1e1e";
  }

  try {
    const hex = bgColor.replace("#", "");
    if (hex.length !== 6) {
      return "#1e1e1e";
    }

    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return "#1e1e1e";
    }

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#1e1e1e" : "#ffffff";
  } catch (error) {
    console.error("Error calculating contrast color:", error);
    return "#1e1e1e";
  }
};

// Helper function to darken color for hover states
const darkenColor = (color: string, amount: number): string => {
  if (!color || typeof color !== "string") {
    return DEFAULT_SETTINGS.accentColor;
  }

  try {
    const hex = color.replace("#", "");
    if (hex.length !== 6) {
      return DEFAULT_SETTINGS.accentColor;
    }

    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return DEFAULT_SETTINGS.accentColor;
    }

    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch (error) {
    console.error("Error darkening color:", error);
    return DEFAULT_SETTINGS.accentColor;
  }
};

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  if (!hex || typeof hex !== "string") {
    return "rgba(186, 207, 101, " + alpha + ")";
  }

  try {
    const h = hex.replace("#", "");
    if (h.length !== 6) {
      return "rgba(186, 207, 101, " + alpha + ")";
    }

    const r = parseInt(h.substr(0, 2), 16);
    const g = parseInt(h.substr(2, 2), 16);
    const b = parseInt(h.substr(4, 2), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return "rgba(186, 207, 101, " + alpha + ")";
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (error) {
    console.error("Error converting hex to rgba:", error);
    return "rgba(186, 207, 101, " + alpha + ")";
  }
};

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

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error("Failed to load app settings:", error);
    }
    return DEFAULT_SETTINGS;
  });

  const [pendingSettings, setPendingSettings] = useState<AppSettings>(settings);

  // Sync pendingSettings with settings when settings change
  useEffect(() => {
    setPendingSettings(settings);
  }, [settings]);

  // Apply settings to DOM
  useEffect(() => {
    const accentColor = settings.accentColor || DEFAULT_SETTINGS.accentColor;

    // Set CSS variables on root
    const root = document.documentElement;
    root.style.setProperty("--custom-font-size", `${settings.fontSize}px`);
    root.style.setProperty("--custom-font-family", settings.fontFamily);
    root.style.setProperty("--accent-color", accentColor);
    root.style.setProperty(
      "--accent-color-hover",
      darkenColor(accentColor, 20)
    );
    root.style.setProperty(
      "--accent-color-text",
      getContrastColor(accentColor)
    );
    root.style.setProperty(
      "--accent-color-rgba-08",
      hexToRgba(accentColor, 0.08)
    );
    root.style.setProperty(
      "--accent-color-rgba-10",
      hexToRgba(accentColor, 0.1)
    );
    root.style.setProperty(
      "--accent-color-rgba-12",
      hexToRgba(accentColor, 0.12)
    );
    root.style.setProperty(
      "--accent-color-rgba-15",
      hexToRgba(accentColor, 0.15)
    );

    // Function to apply styles based on current page
    const applyPageStyles = () => {
      // Remove old style if exists
      const oldStyle = document.getElementById("app-settings-style");
      if (oldStyle) {
        oldStyle.remove();
      }

      const style = document.createElement("style");
      style.id = "app-settings-style";

      // If on entry page, only apply ChatBox accent color (no font/size changes)
      if (isEntryPage()) {
        style.textContent = `
          /* Entry page - only apply ChatBox accent color */
          .userMessage .messageContent {
            background-color: ${accentColor} !important;
            color: ${getContrastColor(accentColor)} !important;
            border-color: ${accentColor} !important;
          }
        `;
      } else {
        // Apply full settings to app pages (Dashboard, Calendar, etc.)
        style.textContent = `
          /* ===== FONT SETTINGS FOR APP PAGES ===== */
          .ant-layout {
            font-size: ${settings.fontSize}px !important;
            font-family: ${settings.fontFamily} !important;
          }
          
          .ant-layout p,
          .ant-layout span,
          .ant-layout div,
          .ant-layout h1,
          .ant-layout h2,
          .ant-layout h3,
          .ant-layout h4,
          .ant-layout h5,
          .ant-layout h6,
          .ant-layout a,
          .ant-layout li,
          .ant-layout td,
          .ant-layout th,
          .ant-layout label {
            font-family: ${settings.fontFamily} !important;
          }
          
          .ant-layout p,
          .ant-layout span,
          .ant-layout div,
          .ant-layout a,
          .ant-layout li,
          .ant-layout td,
          .ant-layout th,
          .ant-layout label,
          .ant-layout input,
          .ant-layout textarea,
          .ant-layout select,
          .ant-layout button {
            font-size: ${settings.fontSize}px !important;
          }
          
          .ant-layout input,
          .ant-layout textarea,
          .ant-layout .ant-input,
          .ant-layout .ant-input-affix-wrapper input,
          .ant-layout .ant-input-affix-wrapper textarea,
          .ant-layout textarea.ant-input {
            font-family: ${settings.fontFamily} !important;
            font-size: ${settings.fontSize}px !important;
          }
          
          .ant-layout input:focus,
          .ant-layout textarea:focus,
          .ant-layout .ant-input:focus,
          .ant-layout .ant-input-affix-wrapper-focused input,
          .ant-layout textarea.ant-input:focus {
            caret-color: ${accentColor} !important;
          }
          
          .ant-layout input::placeholder,
          .ant-layout textarea::placeholder,
          .ant-layout .ant-input::placeholder,
          .ant-layout .ant-input-affix-wrapper input::placeholder {
            font-family: ${settings.fontFamily} !important;
          }
          
          /* ===== ACCENT COLOR FOR APP PAGES ===== */
          .ant-layout .ant-btn-primary,
          .ant-layout .ant-btn-primary:not(:disabled):not(.ant-btn-disabled) {
            background-color: ${accentColor} !important;
            border-color: ${accentColor} !important;
          }
          
          .ant-layout .ant-btn-primary:hover:not(:disabled):not(.ant-btn-disabled),
          .ant-layout .ant-btn-primary:focus:not(:disabled):not(.ant-btn-disabled) {
            background-color: ${darkenColor(accentColor, 20)} !important;
            border-color: ${darkenColor(accentColor, 20)} !important;
          }
          
          .ant-layout a {
            color: ${accentColor} !important;
          }
          
          .ant-layout a:hover {
            color: ${darkenColor(accentColor, 20)} !important;
          }
          
          /* ===== BRAND PROFILE COMPANY SELECTOR ===== */
          .ant-layout [class*="companyItemActive"] {
            border-color: ${accentColor} !important;
          }
          
          .ant-layout [class*="companyItem"]:hover {
            border-color: ${accentColor} !important;
          }
          
          .ant-layout [class*="addCompanyBtn"]:hover {
            border-color: ${accentColor} !important;
            color: ${accentColor} !important;
          }
          
          .ant-layout [class*="addCompanyBtn"]:focus,
          .ant-layout [class*="addCompanyBtn"]:focus-visible {
            border-color: ${accentColor} !important;
            color: ${accentColor} !important;
            box-shadow: 0 0 0 2px ${hexToRgba(accentColor, 0.1)} !important;
          }
          
          /* ===== CHATBOX SPECIFIC ===== */
          .userMessage .messageContent {
            background-color: ${accentColor} !important;
            color: ${getContrastColor(accentColor)} !important;
            border-color: ${accentColor} !important;
          }
          
          /* ===== FONT SETTINGS FOR MODAL ===== */
          .ant-modal {
            font-size: ${settings.fontSize}px !important;
            font-family: ${settings.fontFamily} !important;
          }
          
          .ant-modal p,
          .ant-modal span,
          .ant-modal div,
          .ant-modal h1,
          .ant-modal h2,
          .ant-modal h3,
          .ant-modal h4,
          .ant-modal h5,
          .ant-modal h6,
          .ant-modal a,
          .ant-modal li,
          .ant-modal td,
          .ant-modal th,
          .ant-modal label {
            font-family: ${settings.fontFamily} !important;
          }
          
          .ant-modal p,
          .ant-modal span,
          .ant-modal div,
          .ant-modal a,
          .ant-modal li,
          .ant-modal td,
          .ant-modal th,
          .ant-modal label,
          .ant-modal input,
          .ant-modal textarea,
          .ant-modal select,
          .ant-modal button {
            font-size: ${settings.fontSize}px !important;
          }
          
          .ant-modal input,
          .ant-modal textarea,
          .ant-modal .ant-input,
          .ant-modal .ant-input-affix-wrapper input,
          .ant-modal .ant-input-affix-wrapper textarea,
          .ant-modal textarea.ant-input {
            font-family: ${settings.fontFamily} !important;
            font-size: ${settings.fontSize}px !important;
          }
          
          .ant-modal input:focus,
          .ant-modal textarea:focus,
          .ant-modal .ant-input:focus,
          .ant-modal .ant-input-affix-wrapper-focused input,
          .ant-modal textarea.ant-input:focus {
            caret-color: ${accentColor} !important;
          }
          
          .ant-modal input::placeholder,
          .ant-modal textarea::placeholder,
          .ant-modal .ant-input::placeholder,
          .ant-modal .ant-input-affix-wrapper input::placeholder {
            font-family: ${settings.fontFamily} !important;
          }
          
          /* ===== ACCENT COLOR FOR MODAL ===== */
          .ant-modal .ant-btn-primary,
          .ant-modal .ant-btn-primary:not(:disabled):not(.ant-btn-disabled) {
            background-color: ${accentColor} !important;
            border-color: ${accentColor} !important;
          }
          
          .ant-modal .ant-btn-primary:hover:not(:disabled):not(.ant-btn-disabled),
          .ant-modal .ant-btn-primary:focus:not(:disabled):not(.ant-btn-disabled) {
            background-color: ${darkenColor(accentColor, 20)} !important;
            border-color: ${darkenColor(accentColor, 20)} !important;
          }
          
          /* ===== ACCENT COLOR FOR MODAL TABS ===== */
          .ant-modal .ant-tabs-tab.ant-tabs-tab-active,
          .ant-modal .ant-tabs-tab-active,
          .ant-modal .ant-tabs-tab-active .ant-tabs-tab-btn {
            color: ${accentColor} !important;
          }
          
          .ant-modal .ant-tabs-ink-bar {
            background: ${accentColor} !important;
          }
          
          .ant-modal .ant-tabs-tab:hover {
            color: ${accentColor} !important;
          }
        `;
      }

      document.head.appendChild(style);
    };

    // Apply styles initially
    applyPageStyles();

    // Listen for route changes
    const handleRouteChange = () => {
      setTimeout(applyPageStyles, 50); // Small delay to ensure URL has updated
    };

    window.addEventListener("popstate", handleRouteChange);

    // Override pushState and replaceState for SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleRouteChange();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      handleRouteChange();
    };

    // Backup: check periodically for route changes
    const interval = setInterval(() => {
      const styleEl = document.getElementById("app-settings-style");
      if (styleEl) {
        const onEntryPage = isEntryPage();
        const hasAppStyles = styleEl.textContent?.includes(".ant-layout {");

        if ((onEntryPage && hasAppStyles) || (!onEntryPage && !hasAppStyles)) {
          applyPageStyles();
        }
      }
    }, 300);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      clearInterval(interval);
    };
  }, [settings]);

  // Save to localStorage when settings change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save app settings:", error);
    }
  }, [settings]);

  const updatePendingSettings = (newSettings: Partial<AppSettings>) => {
    setPendingSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const applySettingsFunc = () => {
    setSettings(pendingSettings);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setPendingSettings(DEFAULT_SETTINGS);
  };

  const resetPendingSettings = () => {
    setPendingSettings(settings);
  };

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        pendingSettings,
        updatePendingSettings,
        applySettings: applySettingsFunc,
        resetSettings,
        resetPendingSettings,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useAppSettings must be used within an AppSettingsProvider"
    );
  }
  return context;
}
