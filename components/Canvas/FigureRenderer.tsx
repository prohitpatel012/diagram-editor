import React from 'react';
import { CanvasElement } from '@/types/canvas';

interface FigureRendererProps {
  element: CanvasElement;
  strokeDasharray?: string;
}

export const FigureRenderer: React.FC<FigureRendererProps> = ({ element, strokeDasharray }) => {
  const { x, y, width, height, strokeColor, fillColor, strokeWidth, figureType } = element;

  const w = Math.max(10, width);
  const h = Math.max(10, height);

  switch (figureType) {
    case 'diamond': {
      const points = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
      return (
        <polygon
          points={points}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      );
    }

    case 'triangle': {
      const points = `${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}`;
      return (
        <polygon
          points={points}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinejoin="round"
        />
      );
    }

    case 'hexagon': {
      const offset = w * 0.25;
      const points = `${x + offset},${y} ${x + w - offset},${y} ${x + w},${y + h / 2} ${x + w - offset},${y + h} ${x + offset},${y + h} ${x},${y + h / 2}`;
      return (
        <polygon
          points={points}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinejoin="round"
        />
      );
    }

    case 'cylinder': {
      const rx = w / 2;
      const ry = Math.min(25, h / 4);
      const cx = x + rx;
      const topCy = y + ry;
      const bottomCy = y + h - ry;

      return (
        <g>
          {/* Cylinder Body */}
          <path
            d={`M ${x} ${topCy} 
                L ${x} ${bottomCy} 
                A ${rx} ${ry} 0 0 0 ${x + w} ${bottomCy} 
                L ${x + w} ${topCy} 
                Z`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
          {/* Bottom curve border */}
          <path
            d={`M ${x} ${bottomCy} A ${rx} ${ry} 0 0 0 ${x + w} ${bottomCy}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
          {/* Top Ellipse Cap */}
          <ellipse
            cx={cx}
            cy={topCy}
            rx={rx}
            ry={ry}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
        </g>
      );
    }

    case 'cloud': {
      // Cloud SVG path normalized to w and h
      return (
        <path
          d={`M ${x + w * 0.25} ${y + h * 0.75}
              A ${w * 0.2} ${h * 0.25} 0 0 1 ${x + w * 0.2} ${y + h * 0.4}
              A ${w * 0.25} ${h * 0.35} 0 0 1 ${x + w * 0.55} ${y + h * 0.25}
              A ${w * 0.28} ${h * 0.35} 0 0 1 ${x + w * 0.85} ${y + h * 0.45}
              A ${w * 0.2} ${h * 0.28} 0 0 1 ${x + w * 0.82} ${y + h * 0.75}
              Z`}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinejoin="round"
        />
      );
    }

    case 'server': {
      const rx = 6;
      const slotH = h / 3;
      return (
        <g>
          {/* Main Server Chassis */}
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={rx}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
          {/* Rack dividers */}
          <line
            x1={x}
            y1={y + slotH}
            x2={x + w}
            y2={y + slotH}
            stroke={strokeColor}
            strokeWidth={strokeWidth * 0.75}
            strokeDasharray={strokeDasharray}
          />
          <line
            x1={x}
            y1={y + slotH * 2}
            x2={x + w}
            y2={y + slotH * 2}
            stroke={strokeColor}
            strokeWidth={strokeWidth * 0.75}
            strokeDasharray={strokeDasharray}
          />
          {/* LED indicators */}
          <circle cx={x + w - 14} cy={y + slotH / 2} r={3} fill={strokeColor} />
          <circle cx={x + w - 24} cy={y + slotH / 2} r={3} fill={strokeColor} opacity={0.6} />
          <circle cx={x + w - 14} cy={y + slotH * 1.5} r={3} fill={strokeColor} />
          <circle cx={x + w - 24} cy={y + slotH * 1.5} r={3} fill={strokeColor} opacity={0.6} />
          <circle cx={x + w - 14} cy={y + slotH * 2.5} r={3} fill={strokeColor} />
          <circle cx={x + w - 24} cy={y + slotH * 2.5} r={3} fill={strokeColor} opacity={0.6} />
        </g>
      );
    }

    case 'star': {
      // 5-point star
      const cx = x + w / 2;
      const cy = y + h / 2;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.42;
      const pts: string[] = [];

      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
      }

      return (
        <polygon
          points={pts.join(' ')}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinejoin="round"
        />
      );
    }

    case 'speech': {
      const r = 8;
      const tailW = Math.min(24, w * 0.25);
      const tailH = Math.min(16, h * 0.2);
      const boxH = h - tailH;

      return (
        <path
          d={`M ${x + r} ${y} 
              L ${x + w - r} ${y} 
              A ${r} ${r} 0 0 1 ${x + w} ${y + r} 
              L ${x + w} ${y + boxH - r} 
              A ${r} ${r} 0 0 1 ${x + w - r} ${y + boxH} 
              L ${x + tailW * 2} ${y + boxH} 
              L ${x + tailW * 1.2} ${y + h} 
              L ${x + tailW} ${y + boxH} 
              L ${x + r} ${y + boxH} 
              A ${r} ${r} 0 0 1 ${x} ${y + boxH - r} 
              L ${x} ${y + r} 
              A ${r} ${r} 0 0 1 ${x + r} ${y} 
              Z`}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinejoin="round"
        />
      );
    }

    case 'stickman': {
      const headR = Math.min(w * 0.18, h * 0.15);
      const headCx = x + w / 2;
      const headCy = y + headR + 2;
      const neckY = headCy + headR;
      const crotchY = y + h * 0.62;
      const armY = y + h * 0.35;

      return (
        <g>
          {/* Head */}
          <circle
            cx={headCx}
            cy={headCy}
            r={headR}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          {/* Spine */}
          <line
            x1={headCx}
            y1={neckY}
            x2={headCx}
            y2={crotchY}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
          {/* Arms */}
          <line
            x1={x + w * 0.15}
            y1={armY}
            x2={x + w * 0.85}
            y2={armY}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
          />
          {/* Left Leg */}
          <line
            x1={headCx}
            y1={crotchY}
            x2={x + w * 0.2}
            y2={y + h}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
          />
          {/* Right Leg */}
          <line
            x1={headCx}
            y1={crotchY}
            x2={x + w * 0.8}
            y2={y + h}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
          />
        </g>
      );
    }

    default:
      return null;
  }
};

