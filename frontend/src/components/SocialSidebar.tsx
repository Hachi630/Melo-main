import {
  LinkedinOutlined,
  TwitterOutlined,
  InstagramOutlined,
  FacebookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Layout, Button, Typography, Avatar, Tooltip } from "antd";
import React from "react";
import styles from "./SocialSidebar.module.css";

const { Sider } = Layout;

export type SocialPlatform = "linkedin" | "twitter" | "instagram" | "facebook";

interface SocialSidebarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  selectedPlatform: SocialPlatform;
  onPlatformSelect: (platform: SocialPlatform) => void;
  linkedInConnected?: boolean;
  twitterConnected?: boolean;
  instagramConnected?: boolean;
  facebookConnected?: boolean;
}

interface PlatformConfig {
  key: SocialPlatform;
  label: string;
  icon: React.ReactNode;
  color: string;
  connected: boolean;
}

export default function SocialSidebar({
  collapsed,
  onToggleSidebar,
  selectedPlatform,
  onPlatformSelect,
  linkedInConnected = false,
  twitterConnected = false,
  instagramConnected = false,
  facebookConnected = false,
}: SocialSidebarProps) {
  const platforms: PlatformConfig[] = [
    {
      key: "linkedin",
      label: "LinkedIn",
      icon: <LinkedinOutlined />,
      color: "#0077B5",
      connected: linkedInConnected,
    },
    {
      key: "twitter",
      label: "Twitter/X",
      icon: <TwitterOutlined />,
      color: "#1DA1F2",
      connected: twitterConnected,
    },
    {
      key: "instagram",
      label: "Instagram",
      icon: <InstagramOutlined />,
      color: "#E4405F",
      connected: instagramConnected,
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: <FacebookOutlined />,
      color: "#1877F2",
      connected: facebookConnected,
    },
  ];

  return (
    <Sider
      width={280}
      collapsedWidth={80}
      collapsed={collapsed}
      theme="light"
      trigger={null}
      className={styles.socialSider}
    >
      <div className={styles.sidebarContainer}>
        {/* Header - Hide when collapsed to avoid blocking logo */}
        {!collapsed && (
          <div className={styles.header}>
            <Button
              shape="circle"
              icon={<MenuFoldOutlined />}
              onClick={onToggleSidebar}
              className={styles.menuButton}
            />
            <Typography.Title level={5} className={styles.title}>
              Social Accounts
            </Typography.Title>
          </div>
        )}

        {/* Platform List */}
        <div className={styles.platformList}>
          {/* Toggle button for collapsed state - positioned at top of list */}
          {collapsed && (
            <div
              style={{
                padding: "8px 0",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Button
                shape="circle"
                icon={<MenuUnfoldOutlined />}
                onClick={onToggleSidebar}
                className={styles.menuButton}
                size="small"
              />
            </div>
          )}
          {platforms.map((platform) => {
            const isSelected = selectedPlatform === platform.key;
            const PlatformIcon = platform.icon;

            return (
              <Tooltip
                key={platform.key}
                title={collapsed ? platform.label : undefined}
                placement="right"
              >
                <div
                  className={`${styles.platformItem} ${
                    isSelected ? styles.platformItemActive : ""
                  }`}
                  onClick={() => onPlatformSelect(platform.key)}
                >
                  <div className={styles.platformContent}>
                    <Avatar
                      size={collapsed ? 32 : 40}
                      icon={PlatformIcon}
                      style={{
                        backgroundColor: platform.color,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    />
                    {!collapsed && (
                      <div className={styles.platformInfo}>
                        <Typography.Text
                          strong
                          className={styles.platformLabel}
                        >
                          {platform.label}
                        </Typography.Text>
                        <div className={styles.platformStatus}>
                          <span
                            className={`${styles.statusDot} ${
                              platform.connected
                                ? styles.statusDotConnected
                                : styles.statusDotDisconnected
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {!collapsed && isSelected && (
                    <div
                      className={styles.selectedIndicator}
                      style={{ backgroundColor: platform.color }}
                    />
                  )}
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </Sider>
  );
}
