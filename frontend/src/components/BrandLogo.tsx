import React from 'react';
import { Avatar } from 'antd';
import styles from './BrandLogo.module.css';

interface BrandLogoProps {
  brandLogoUrl?: string;
  brandName?: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export default function BrandLogo({ 
  brandLogoUrl, 
  brandName, 
  size = 18, 
  style,
  className 
}: BrandLogoProps) {
  // If logo URL exists, use it
  if (brandLogoUrl) {
    return (
      <img 
        src={brandLogoUrl} 
        alt={brandName || 'Brand'} 
        className={`${styles.brandLogo} ${className || ''}`}
        style={{ width: size, height: size, ...style }}
      />
    );
  }

  // Otherwise, use brand name initial(s)
  const getInitials = (name?: string): string => {
    if (!name) return '?';
    
    // Handle special cases like "H&M"
    if (name.includes('&')) {
      const parts = name.split('&');
      return parts.map(part => part.trim()[0]?.toUpperCase() || '').join('&');
    }
    
    // Handle multiple words
    const words = name.trim().split(/\s+/);
    if (words.length > 1) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    
    // Single word - take first character
    return name[0]?.toUpperCase() || '?';
  };

  const initials = getInitials(brandName);

  return (
    <Avatar
      size={size}
      className={`${styles.brandAvatar} ${className || ''}`}
      style={style}
    >
      {initials}
    </Avatar>
  );
}

