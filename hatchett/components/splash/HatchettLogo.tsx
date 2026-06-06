import React from 'react';
import { cn } from '@/lib/utils';

interface HatchettLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function HatchettLogo({ size = 'md', className }: HatchettLogoProps) {
  const dimensions = {
    sm: { width: 40, height: 53 },
    md: { width: 120, height: 160 },
    lg: { width: 160, height: 213 },
  };

  const { width, height } = dimensions[size];

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('will-change-transform', className)}
      style={{ transform: 'rotate(35deg)' }}
    >
      {/* Handle gradient */}
      <defs>
        <linearGradient id="handleGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6B3410" />
          <stop offset="40%" stopColor="#8B4513" />
          <stop offset="100%" stopColor="#5C2E0A" />
        </linearGradient>
        <linearGradient id="bladeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5A6A8A" />
          <stop offset="50%" stopColor="#8B9DC3" />
          <stop offset="100%" stopColor="#6B7FA3" />
        </linearGradient>
        <linearGradient id="edgeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#C0CCE0" stopOpacity="0.5" />
        </linearGradient>
        <filter id="bladeShadow">
          <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Handle - rounded rectangle */}
      <rect
        x="48"
        y="60"
        width="18"
        height="90"
        rx="9"
        ry="9"
        fill="url(#handleGrad)"
      />
      {/* Handle grain lines */}
      <line x1="52" y1="65" x2="52" y2="145" stroke="#6B3410" strokeWidth="1" strokeOpacity="0.5" />
      <line x1="57" y1="65" x2="57" y2="145" stroke="#9B5523" strokeWidth="0.5" strokeOpacity="0.3" />
      <line x1="62" y1="65" x2="62" y2="145" stroke="#6B3410" strokeWidth="1" strokeOpacity="0.4" />

      {/* Blade - angular polygon facing right */}
      <polygon
        points="65,20 115,40 115,80 65,90 55,55"
        fill="url(#bladeGrad)"
        filter="url(#bladeShadow)"
      />

      {/* Blade depth / dark edge */}
      <polygon
        points="65,20 70,25 70,85 65,90 55,55"
        fill="#5A6A8A"
        opacity="0.7"
      />

      {/* Cutting edge highlight */}
      <line
        x1="115"
        y1="40"
        x2="115"
        y2="80"
        stroke="url(#edgeGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Top blade edge */}
      <line
        x1="65"
        y1="20"
        x2="115"
        y2="40"
        stroke="#C0CCE0"
        strokeWidth="1.5"
        strokeOpacity="0.7"
        strokeLinecap="round"
      />

      {/* Bottom blade edge */}
      <line
        x1="65"
        y1="90"
        x2="115"
        y2="80"
        stroke="#7A8BA8"
        strokeWidth="1"
        strokeOpacity="0.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
