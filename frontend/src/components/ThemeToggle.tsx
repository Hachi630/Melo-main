import { useTheme } from "../contexts/ThemeContext";
import { useAppSettings } from "../contexts/AppSettingsContext";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { pendingSettings, updatePendingSettings } = useAppSettings();
  const isWarm = theme === "warm";
  // Use pendingSettings to show current selection state
  const isNightMode = pendingSettings.darkMode || false;

  const handleClassicClick = () => {
    if (!isWarm && !isNightMode) return; // Already on classic, do nothing
    if (isNightMode) {
      // Disable night mode in pending settings (will apply when user clicks Apply)
      updatePendingSettings({ darkMode: false });
    }
    if (isWarm) {
      // Classic/Warm toggle immediately (no need for Apply)
      toggleTheme();
    }
  };

  const handleWarmClick = () => {
    if (isWarm && !isNightMode) return; // Already on warm, do nothing
    if (isNightMode) {
      // Disable night mode in pending settings (will apply when user clicks Apply)
      updatePendingSettings({ darkMode: false });
    }
    if (!isWarm) {
      // Classic/Warm toggle immediately (no need for Apply)
      toggleTheme();
    }
  };

  const handleNightModeClick = () => {
    const newDarkMode = !isNightMode;
    // Only update pending settings, don't apply immediately
    // User must click Apply button for Night Mode to take effect
    updatePendingSettings({ darkMode: newDarkMode });
  };

  return (
    <div className={styles.toggleContainer}>
      <button
        className={`${styles.segment} ${!isWarm && !isNightMode ? styles.active : ""}`}
        onClick={handleClassicClick}
        aria-label="Switch to classic mode"
      >
        Classic
      </button>
      <button
        className={`${styles.segment} ${isWarm && !isNightMode ? styles.active : ""}`}
        onClick={handleWarmClick}
        aria-label="Switch to warm mode"
      >
        Warm
      </button>
      <button
        className={`${styles.segment} ${isNightMode ? styles.active : ""}`}
        onClick={handleNightModeClick}
        aria-label="Switch to night mode"
      >
        Night
      </button>
    </div>
  );
}
