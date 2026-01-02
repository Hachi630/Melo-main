import {
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Select,
  Slider,
  Typography,
  message,
} from "antd";
import {
  SettingOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import styles from "./AppSettings.module.css";
import { useAppSettings } from "../contexts/AppSettingsContext";
import ThemeToggle from "../components/ThemeToggle";

const { Text } = Typography;

const fontOptions = [
  {
    value: "Inter, system-ui, sans-serif",
    label: "Inter",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  {
    value: "'ZCOOL KuaiLe', Inter, system-ui, sans-serif",
    label: "ZCOOL KuaiLe",
    fontFamily: "'ZCOOL KuaiLe', Inter, system-ui, sans-serif",
  },
  {
    value: "Arial, sans-serif",
    label: "Arial",
    fontFamily: "Arial, sans-serif",
  },
  { value: "Georgia, serif", label: "Georgia", fontFamily: "Georgia, serif" },
  {
    value: "'Times New Roman', serif",
    label: "Times New Roman",
    fontFamily: "'Times New Roman', serif",
  },
];

const accentColorOptions = [
  { value: "#bacf65", label: "Green", color: "#bacf65" },
  { value: "#fbda41", label: "Yellow", color: "#fbda41" },
  { value: "#b9dec9", label: "Mint", color: "#b9dec9" },
  { value: "#83cbac", label: "Teal", color: "#83cbac" },
  { value: "#93d5dc", label: "Sky", color: "#93d5dc" },
  { value: "#f6cec1", label: "Peach", color: "#f6cec1" },
];

interface AppSettingsProps {
  open: boolean;
  onClose: () => void;
}

export default function AppSettings({ open, onClose }: AppSettingsProps) {
  const {
    settings,
    pendingSettings,
    updatePendingSettings,
    applySettings,
    resetSettings,
    resetPendingSettings,
  } = useAppSettings();

  const handleFontSizeChange = (value: number) => {
    updatePendingSettings({ fontSize: value });
  };

  const handleFontFamilyChange = (value: string) => {
    updatePendingSettings({ fontFamily: value });
  };

  const handleAccentColorChange = (color: string) => {
    updatePendingSettings({ accentColor: color });
  };

  const handleApply = () => {
    const wasDarkMode = settings.darkMode;
    const willBeDarkMode = pendingSettings.darkMode;
    const darkModeChanged = wasDarkMode !== willBeDarkMode;

    applySettings();
    message.success("Settings applied successfully");

    // Close modal first
    onClose();

    // If dark mode changed, refresh the browser after a short delay
    if (darkModeChanged) {
      setTimeout(() => {
        window.location.reload();
      }, 200);
    }
  };

  const handleCancel = () => {
    resetPendingSettings();
    onClose();
  };

  const handleReset = () => {
    resetSettings();
    message.success("Settings reset to default");
  };

  const handleModalClose = () => {
    resetPendingSettings();
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleModalClose}
      title={
        <div className={styles.modalTitle}>
          <SettingOutlined /> App Settings
        </div>
      }
      width={800}
      className={styles.settingsModal}
      footer={[
        <Button
          key="reset"
          icon={<ReloadOutlined />}
          onClick={handleReset}
          className={styles.resetButton}
        >
          Reset to Default
        </Button>,
        <Button key="cancel" onClick={handleCancel} icon={<CloseOutlined />}>
          Cancel
        </Button>,
        <Button
          key="apply"
          type="primary"
          onClick={handleApply}
          icon={<CheckOutlined />}
        >
          Apply
        </Button>,
      ]}
      centered
    >
      <div className={styles.modalContent}>
        <Row gutter={[24, 24]}>
          {/* Theme Toggle */}
          <Col xs={24} sm={24} md={12} lg={12}>
            <Card className={styles.settingCard} title="Theme Mode">
              <div className={styles.settingItem}>
                <Text className={styles.settingLabel}>Select Theme</Text>
                <div className={styles.themeToggleWrapper}>
                  <ThemeToggle />
                </div>
                <Text className={styles.settingDescription}>
                  Switch between Classic and Warm themes
                </Text>
              </div>
            </Card>
          </Col>

          {/* Font Size */}
          <Col xs={24} sm={24} md={12} lg={12}>
            <Card className={styles.settingCard} title="Font Size">
              <div className={styles.settingItem}>
                <Text className={styles.settingLabel}>
                  Font Size: {pendingSettings.fontSize}px
                </Text>
                <Slider
                  min={10}
                  max={24}
                  value={pendingSettings.fontSize}
                  onChange={handleFontSizeChange}
                  className={styles.slider}
                />
                <Text className={styles.settingDescription}>
                  Adjust the font size for the application (10px - 24px)
                </Text>
              </div>
            </Card>
          </Col>

          {/* Font Family */}
          <Col xs={24} sm={24} md={12} lg={12}>
            <Card className={styles.settingCard} title="Font Family">
              <div className={styles.settingItem}>
                <Text className={styles.settingLabel}>Font Family</Text>
                <div style={{ fontFamily: pendingSettings.fontFamily }}>
                  <Select
                    value={pendingSettings.fontFamily}
                    onChange={handleFontFamilyChange}
                    className={styles.select}
                    style={{ width: "100%" }}
                    getPopupContainer={(triggerNode) =>
                      triggerNode.parentElement || document.body
                    }
                  >
                    {fontOptions.map((option) => (
                      <Select.Option
                        key={option.value}
                        value={option.value}
                        label={option.label}
                      >
                        <span style={{ fontFamily: option.fontFamily }}>
                          {option.label}
                        </span>
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <Text className={styles.settingDescription}>
                  Choose the font family for the application
                </Text>
              </div>
            </Card>
          </Col>

          {/* Accent Color */}
          <Col xs={24} sm={24} md={12} lg={12}>
            <Card className={styles.settingCard} title="Accent Color">
              <div className={styles.settingItem}>
                <Text className={styles.settingLabel}>Theme Color</Text>
                <div className={styles.colorGrid}>
                  {accentColorOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`${styles.colorSwatch} ${
                        pendingSettings.accentColor === option.value
                          ? styles.colorSwatchActive
                          : ""
                      }`}
                      style={{ backgroundColor: option.color }}
                      onClick={() => handleAccentColorChange(option.value)}
                      title={option.label}
                      aria-label={`Select ${option.label} color`}
                    />
                  ))}
                </div>
                <div className={styles.colorPickerWrapper}>
                  <Input
                    type="color"
                    value={pendingSettings.accentColor}
                    onChange={(e) => handleAccentColorChange(e.target.value)}
                    className={styles.colorInput}
                  />
                  <Input
                    value={pendingSettings.accentColor}
                    onChange={(e) => handleAccentColorChange(e.target.value)}
                    className={styles.colorTextInput}
                    placeholder="#646cff"
                  />
                </div>
                <Text className={styles.settingDescription}>
                  Choose the accent color for buttons and your messages
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </Modal>
  );
}
