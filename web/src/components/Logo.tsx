import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 120, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shopping Cart Body */}
      <rect x="40" y="80" width="120" height="80" rx="8" fill="#0ea5e9" />
      <rect x="45" y="85" width="110" height="70" rx="6" fill="#38bdf8" />
      
      {/* Cart Handle */}
      <path
        d="M 30 50 Q 30 30 50 30 L 150 30 Q 170 30 170 50"
        stroke="#0ea5e9"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Cart Wheels */}
      <circle cx="70" cy="170" r="12" fill="#0369a1" />
      <circle cx="130" cy="170" r="12" fill="#0369a1" />
      <circle cx="70" cy="170" r="6" fill="#075985" />
      <circle cx="130" cy="170" r="6" fill="#075985" />
      
      {/* Left Eye */}
      <g>
        <ellipse cx="80" cy="110" rx="18" ry="22" fill="white" />
        <ellipse cx="82" cy="112" rx="10" ry="12" fill="#1e293b" />
        <circle cx="84" cy="108" r="4" fill="white" />
      </g>
      
      {/* Right Eye */}
      <g>
        <ellipse cx="120" cy="110" rx="18" ry="22" fill="white" />
        <ellipse cx="122" cy="112" rx="10" ry="12" fill="#1e293b" />
        <circle cx="124" cy="108" r="4" fill="white" />
      </g>
      
      {/* Happy Smile */}
      <path
        d="M 70 135 Q 100 148 130 135"
        stroke="#0369a1"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Cart Items (visible inside) */}
      <rect x="60" y="95" width="15" height="20" rx="2" fill="#22c55e" opacity="0.6" />
      <rect x="85" y="90" width="18" height="25" rx="2" fill="#f59e0b" opacity="0.6" />
      <rect x="115" y="95" width="20" height="22" rx="2" fill="#ef4444" opacity="0.6" />
    </svg>
  );
};

export const LogoSmall: React.FC<LogoProps> = ({ size = 40, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="40" y="80" width="120" height="80" rx="8" fill="#0ea5e9" />
      <rect x="45" y="85" width="110" height="70" rx="6" fill="#38bdf8" />
      <path d="M 30 50 Q 30 30 50 30 L 150 30 Q 170 30 170 50" stroke="#0ea5e9" strokeWidth="8" fill="none" strokeLinecap="round" />
      <circle cx="70" cy="170" r="12" fill="#0369a1" />
      <circle cx="130" cy="170" r="12" fill="#0369a1" />
      <ellipse cx="80" cy="110" rx="18" ry="22" fill="white" />
      <ellipse cx="82" cy="112" rx="10" ry="12" fill="#1e293b" />
      <ellipse cx="120" cy="110" rx="18" ry="22" fill="white" />
      <ellipse cx="122" cy="112" rx="10" ry="12" fill="#1e293b" />
      <path d="M 70 135 Q 100 148 130 135" stroke="#0369a1" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  );
};
