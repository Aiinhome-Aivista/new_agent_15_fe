import React from 'react';
import { RefreshCw } from 'lucide-react';
import '../styles/loading-spinner.css';

/**
 * Global Unified Loader Component for DEVAA Application
 */
export default function LoadingSpinner({ 
  text, 
  size = 'md', 
  inline = false, 
  color = '#FF5A14',
  className = '' 
}) {
  const iconSizeMap = {
    xs: 12,
    sm: 14,
    md: 28,
    lg: 40
  };

  const iconSize = typeof size === 'number' ? size : (iconSizeMap[size] || 28);

  if (inline) {
    return (
      <span className={`devaa-loader-inline ${className}`}>
        <RefreshCw 
          size={iconSize} 
          className="devaa-spinner-icon" 
          style={{ color }} 
        />
        {text && <span className="devaa-loader-text-inline">{text}</span>}
      </span>
    );
  }

  return (
    <div className={`devaa-loader-container devaa-loader-${size} ${className}`}>
      <div className="devaa-spinner-wrapper">
        <RefreshCw 
          size={iconSize} 
          className="devaa-spinner-icon" 
          style={{ color }} 
        />
      </div>
      {text && <p className="devaa-loader-text">{text}</p>}
    </div>
  );
}
