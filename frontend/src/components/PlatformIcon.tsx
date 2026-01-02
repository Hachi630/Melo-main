import {
    InstagramOutlined,
    FacebookFilled,
    TwitterOutlined,
    LinkedinFilled,
    GlobalOutlined
} from '@ant-design/icons';
import React from 'react';

// Custom TikTok Icon since it might not be in the current antd icon set
const TikTokIcon = ({ style }: { style?: React.CSSProperties }) => (
    <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="currentColor"
        style={style}
        aria-hidden="true"
    >
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
);

export const PLATFORM_COLORS: Record<string, string> = {
    instagram_post: '#E1306C',
    instagram_story: '#F77737',
    instagram_reels: '#833AB4',
    tiktok: '#000000',
    facebook: '#1877F2',
    twitter: '#1DA1F2',
    linkedin: '#0077B5',
};

interface PlatformIconProps {
    platform: string;
    style?: React.CSSProperties;
    className?: string;
}

export default function PlatformIcon({ platform, style, className }: PlatformIconProps) {
    const color = PLATFORM_COLORS[platform] || '#8c8c8c';
    const iconStyle = { color, ...style };

    switch (platform) {
        case 'instagram_post':
        case 'instagram_story':
        case 'instagram_reels':
            return <InstagramOutlined style={iconStyle} className={className} />;
        case 'facebook':
            return <FacebookFilled style={iconStyle} className={className} />;
        case 'twitter':
            // X logo is standard now but TwitterOutlined is the safe fallback in antd
            return <TwitterOutlined style={iconStyle} className={className} />;
        case 'linkedin':
            return <LinkedinFilled style={iconStyle} className={className} />;
        case 'tiktok':
            return <TikTokIcon style={iconStyle} />;
        default:
            return <GlobalOutlined style={iconStyle} className={className} />;
    }
}
