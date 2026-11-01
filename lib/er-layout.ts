import { ERTable, ERRelationship } from '@/types/er';

export function estimateTableHeight(table: ERTable): number {
  if (table.isMinimized) return 56;
  const headerHeight = 60;
  const colCount = Math.max(1, table.columns.length);
  const rowHeight = 36;
  const footerHeight = (table.indexes && table.indexes.length > 0) ? 36 : 16;
  return headerHeight + colCount * rowHeight + footerHeight;
}

export function autoLayoutERDiagram(
  tables: ERTable[],
  relationships: ERRelationship[]
): ERTable[] {
  if (tables.length === 0) return [];

  const tableMap = new Map(tables.map((t) => [t.id, t]));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const t of tables) {
    inDegree.set(t.id, 0);
    adj.set(t.id, []);
  }

  // Directed edges from referenced table (parent) to referencing table (child)
  for (const rel of relationships) {
    const parentId = rel.targetTableId;
    const childId = rel.sourceTableId;
    if (tableMap.has(parentId) && tableMap.has(childId) && parentId !== childId) {
      adj.get(parentId)?.push(childId);
      inDegree.set(childId, (inDegree.get(childId) || 0) + 1);
    }
  }

  // Assign ranks using BFS / topological layering
  const ranks = new Map<string, number>();
  const queue: { id: string; rank: number }[] = [];

  // Start with root tables (inDegree === 0)
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push({ id, rank: 0 });
      ranks.set(id, 0);
    }
  }

  // If cyclic or all have in-degree > 0, seed with first table
  if (queue.length === 0 && tables.length > 0) {
    queue.push({ id: tables[0].id, rank: 0 });
    ranks.set(tables[0].id, 0);
  }

  while (queue.length > 0) {
    const { id, rank } = queue.shift()!;
    const neighbors = adj.get(id) || [];
    for (const n of neighbors) {
      const currentRank = ranks.get(n);
      const nextRank = rank + 1;
      if (currentRank === undefined || nextRank > currentRank) {
        ranks.set(n, nextRank);
        queue.push({ id: n, rank: nextRank });
      }
    }
  }

  // Handle any remaining disconnected tables
  for (const t of tables) {
    if (!ranks.has(t.id)) {
      ranks.set(t.id, 0);
    }
  }

  // Group tables by rank (columns)
  const columns = new Map<number, ERTable[]>();
  for (const t of tables) {
    const rank = ranks.get(t.id) || 0;
    if (!columns.has(rank)) columns.set(rank, []);
    columns.get(rank)!.push(t);
  }

  const sortedRanks = Array.from(columns.keys()).sort((a, b) => a - b);

  // Position tables in columns with collision avoidance
  const startX = 120;
  const startY = 120;
  const colWidth = 360;
  const horizontalGap = 80;
  const verticalGap = 48;

  const layoutedTables: ERTable[] = [];

  sortedRanks.forEach((rank, colIdx) => {
    const colTables = columns.get(rank)!;
    const x = startX + colIdx * (colWidth + horizontalGap);
    let currentY = startY;

    for (const table of colTables) {
      const height = estimateTableHeight(table);
      layoutedTables.push({
        ...table,
        x,
        y: currentY,
        width: colWidth,
      });
      currentY += height + verticalGap;
    }
  });

  return layoutedTables;
}

