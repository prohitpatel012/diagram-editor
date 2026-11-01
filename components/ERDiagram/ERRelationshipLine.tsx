import React from 'react';
import { ERRelationship, ERTable, Cardinality, Optionality } from '@/types/er';
import { LuTrash2 } from 'react-icons/lu';

interface ERRelationshipLineProps {
  relationship: ERRelationship;
  sourceTable: ERTable;
  targetTable: ERTable;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

// Calculate the vertical offset of a column inside a table card
function getColumnYOffset(table: ERTable, columnId: string): number {
  if (table.isMinimized) {
    return 28; // Center of minimized header
  }
  const headerHeight = 52;
  const colIndex = table.columns.findIndex((c) => c.id === columnId);
  const rowHeight = 36;
  const padding = 12;
  if (colIndex === -1) {
    return headerHeight + 18;
  }
  return headerHeight + padding + colIndex * rowHeight + rowHeight / 2;
}

export const ERRelationshipLine: React.FC<ERRelationshipLineProps> = ({
  relationship,
  sourceTable,
  targetTable,
  isSelected,
  isHighlighted,
  onSelect,
  onDelete,
}) => {
  const tableWidth = sourceTable.width || 340;
  const targetWidth = targetTable.width || 340;

  const srcColY = sourceTable.y + getColumnYOffset(sourceTable, relationship.sourceColumnId);
  const tgtColY = targetTable.y + getColumnYOffset(targetTable, relationship.targetColumnId);

  // Decide exit & entry side (left vs right)
  const isTargetToTheRight = targetTable.x >= sourceTable.x + tableWidth * 0.5;

  let x1: number;
  let x2: number;
  let dir1 = 1; // 1 for right, -1 for left
  let dir2 = -1;

  if (isTargetToTheRight) {
    x1 = sourceTable.x + tableWidth;
    x2 = targetTable.x;
    dir1 = 1;
    dir2 = -1;
  } else {
    x1 = sourceTable.x;
    x2 = targetTable.x + targetWidth;
    dir1 = -1;
    dir2 = 1;
  }

  const y1 = srcColY;
  const y2 = tgtColY;

  // Generate smooth orthogonal / cubic S-curve connector
  const dx = Math.abs(x2 - x1);
  const offset = Math.min(60, Math.max(30, dx * 0.4));
  const cx1 = x1 + dir1 * offset;
  const cy1 = y1;
  const cx2 = x2 + dir2 * offset;
  const cy2 = y2;

  const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

  // Midpoint for cardinality badge and delete button
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const strokeColor = isSelected
    ? '#3b82f6'
    : isHighlighted
    ? '#60a5fa'
    : '#64748b';
  const strokeWidth = isSelected ? 2.5 : isHighlighted ? 2 : 1.5;

  // Crow's foot symbols helper
  const renderCrowsFoot = (
    cx: number,
    cy: number,
    dir: number,
    isCrow: boolean,
    isOptional: boolean
  ) => {
    // dir: 1 (facing right), -1 (facing left)
    const legLen = 14;
    const spread = 8;
    const barX = cx + dir * 8;
    const circleX = cx + dir * (isCrow ? 16 : 14);

    return (
      <g stroke={strokeColor} strokeWidth={strokeWidth} fill="none">
        {/* Crow's foot prongs */}
        {isCrow ? (
          <>
            <line x1={cx} y1={cy} x2={cx + dir * legLen} y2={cy - spread} />
            <line x1={cx} y1={cy} x2={cx + dir * legLen} y2={cy + spread} />
            <line x1={cx} y1={cy} x2={cx + dir * legLen} y2={cy} />
          </>
        ) : (
          /* Single bar */
          <line x1={barX} y1={cy - spread} x2={barX} y2={cy + spread} />
        )}

        {/* Optional (Circle) or Mandatory (Second Bar) */}
        {isOptional ? (
          <circle cx={circleX} cy={cy} r={4.5} fill="#18181b" stroke={strokeColor} />
        ) : (
          <line
            x1={cx + dir * (isCrow ? 15 : 14)}
            y1={cy - spread}
            x2={cx + dir * (isCrow ? 15 : 14)}
            y2={cy + spread}
          />
        )}
      </g>
    );
  };

  const isSourceCrow = relationship.cardinality === 'M:N';
  const isTargetCrow = relationship.cardinality === '1:N' || relationship.cardinality === 'M:N';

  const isSourceOptional = relationship.sourceOptionality === 'optional';
  const isTargetOptional = relationship.targetOptionality === 'optional';

  return (
    <g
      className="er-relationship-line group cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Invisible wider hit area for easy selection */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        className="pointer-events-auto"
      />

      {/* Main connector line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isSelected ? undefined : undefined}
        className="transition-colors"
      />

      {/* Crow's Foot / Cardinality symbols at Source and Target */}
      {renderCrowsFoot(x1, y1, dir1, isSourceCrow, isSourceOptional)}
      {renderCrowsFoot(x2, y2, dir2, isTargetCrow, isTargetOptional)}

      {/* Midpoint Cardinality Tag */}
      <g transform={`translate(${midX}, ${midY})`} className="pointer-events-auto">
        <rect
          x={-24}
          y={-11}
          width={48}
          height={22}
          rx={6}
          fill={isSelected ? '#1e3a8a' : '#18181b'}
          stroke={strokeColor}
          strokeWidth={1}
          className="shadow-md"
        />
        <text
          x={0}
          y={3}
          textAnchor="middle"
          fontSize={11}
          fontWeight="600"
          fill={isSelected ? '#93c5fd' : '#cbd5e1'}
          className="font-mono select-none"
        >
          {relationship.cardinality}
        </text>

        {/* Delete button (visible when selected or on hover) */}
        {isSelected && (
          <g
            transform="translate(32, -10)"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="cursor-pointer group/del"
          >
            <circle cx={10} cy={10} r={10} fill="#ef4444" className="hover:fill-red-600 transition-colors" />
            <text
              x={10}
              y={13}
              textAnchor="middle"
              fill="#ffffff"
              fontSize={11}
              fontWeight="bold"
            >
              ×
            </text>
          </g>
        )}
      </g>
    </g>
  );
};

