import { ERDiagram, ERTable, ERColumn, ERRelationship, ERIndex } from '@/types/er';

// Export ER Diagram to PostgreSQL DDL SQL script
export function exportERDiagramToSQL(diagram: ERDiagram): string {
  const lines: string[] = [];
  lines.push(`-- ==========================================================`);
  lines.push(`-- PostgreSQL Schema: ${diagram.name || 'Untitled Diagram'}`);
  if (diagram.description) {
    lines.push(`-- Description: ${diagram.description}`);
  }
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- ==========================================================\n`);

  // Enable UUID extension if UUID type is used
  const hasUUID = diagram.tables.some((t) =>
    t.columns.some((c) => c.type.toUpperCase() === 'UUID')
  );
  if (hasUUID) {
    lines.push(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`);
  }

  const tableMap = new Map(diagram.tables.map((t) => [t.id, t]));

  // Generate CREATE TABLE statements
  for (const table of diagram.tables) {
    lines.push(`-- Table: ${table.name}`);
    if (table.description) {
      lines.push(`-- ${table.description}`);
    }
    lines.push(`CREATE TABLE IF NOT EXISTS "${table.name}" (`);

    const colDefinitions: string[] = [];

    // Columns
    for (const col of table.columns) {
      let colDef = `  "${col.name}" ${col.type.toUpperCase()}`;
      if (col.typeModifier) {
        colDef += col.typeModifier;
      }
      if (!col.isNullable) {
        colDef += ' NOT NULL';
      }
      if (col.defaultValue && col.defaultValue.trim() !== '') {
        colDef += ` DEFAULT ${col.defaultValue}`;
      }
      if (col.isUnique && !col.isPrimaryKey) {
        colDef += ' UNIQUE';
      }
      colDefinitions.push(colDef);
    }

    // Composite or single Primary Key
    const pkCols = table.columns.filter((c) => c.isPrimaryKey);
    if (pkCols.length > 0) {
      const pkNames = pkCols.map((c) => `"${c.name}"`).join(', ');
      colDefinitions.push(`  CONSTRAINT "pk_${table.name}" PRIMARY KEY (${pkNames})`);
    }

    lines.push(colDefinitions.join(',\n'));
    lines.push(`);\n`);

    // Table comments
    if (table.description) {
      lines.push(`COMMENT ON TABLE "${table.name}" IS '${table.description.replace(/'/g, "''")}';`);
    }
    // Column comments
    for (const col of table.columns) {
      if (col.comment) {
        lines.push(
          `COMMENT ON COLUMN "${table.name}"."${col.name}" IS '${col.comment.replace(/'/g, "''")}';`
        );
      }
    }
    if (table.description || table.columns.some((c) => c.comment)) {
      lines.push('');
    }

    // Indexes
    if (table.indexes && table.indexes.length > 0) {
      for (const idx of table.indexes) {
        const colNames = idx.columnIds
          .map((id) => table.columns.find((c) => c.id === id)?.name)
          .filter(Boolean)
          .map((n) => `"${n}"`)
          .join(', ');

        if (colNames) {
          const uniqueStr = idx.isUnique ? 'UNIQUE ' : '';
          const methodStr = idx.method ? ` USING ${idx.method}` : '';
          lines.push(
            `CREATE ${uniqueStr}INDEX IF NOT EXISTS "${idx.name}" ON "${table.name}"${methodStr} (${colNames});`
          );
        }
      }
      lines.push('');
    }
  }

  // Foreign Key Constraints (ALTER TABLE)
  if (diagram.relationships.length > 0) {
    lines.push(`-- ==========================================================`);
    lines.push(`-- Foreign Key Constraints`);
    lines.push(`-- ==========================================================\n`);

    for (const rel of diagram.relationships) {
      const sourceTable = tableMap.get(rel.sourceTableId);
      const targetTable = tableMap.get(rel.targetTableId);
      if (!sourceTable || !targetTable) continue;

      const sourceCol = sourceTable.columns.find((c) => c.id === rel.sourceColumnId);
      const targetCol = targetTable.columns.find((c) => c.id === rel.targetColumnId);
      if (!sourceCol || !targetCol) continue;

      const fkName = `fk_${sourceTable.name}_${sourceCol.name}_${targetTable.name}`;
      let fkStmt = `ALTER TABLE "${sourceTable.name}" ADD CONSTRAINT "${fkName}" FOREIGN KEY ("${sourceCol.name}") REFERENCES "${targetTable.name}" ("${targetCol.name}")`;

      if (rel.onDelete) {
        fkStmt += ` ON DELETE ${rel.onDelete}`;
      }
      if (rel.onUpdate) {
        fkStmt += ` ON UPDATE ${rel.onUpdate}`;
      }
      fkStmt += ';';

      lines.push(fkStmt);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// Parse PostgreSQL CREATE TABLE statements to generate an ER Diagram
export function parseSQLToERDiagram(sqlText: string): { tables: ERTable[]; relationships: ERRelationship[] } {
  const tables: ERTable[] = [];
  const relationships: ERRelationship[] = [];

  // Clean SQL: remove block comments and line comments
  const cleanSQL = sqlText
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');

  // Match CREATE TABLE [IF NOT EXISTS] tableName ( body );
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["`]?(\w+)["`]?\.)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\);/gi;

  let match: RegExpExecArray | null;
  let tableIndex = 0;

  const tableColLookup = new Map<string, { tableId: string; colMap: Map<string, string> }>();

  while ((match = createTableRegex.exec(cleanSQL)) !== null) {
    const tableName = match[2] || match[1];
    const body = match[3];
    const tableId = `tbl_${Date.now()}_${tableIndex++}`;

    const columns: ERColumn[] = [];
    const pkColumnNames = new Set<string>();
    const inlineFks: { sourceColName: string; targetTable: string; targetCol: string }[] = [];

    // Split body by top-level commas (ignoring commas inside parentheses)
    const tokens: string[] = [];
    let parenDepth = 0;
    let curToken = '';

    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth--;

      if (ch === ',' && parenDepth === 0) {
        tokens.push(curToken.trim());
        curToken = '';
      } else {
        curToken += ch;
      }
    }
    if (curToken.trim()) tokens.push(curToken.trim());

    // Process table level constraints first
    for (const token of tokens) {
      const line = token.replace(/\s+/g, ' ').trim();

      // PRIMARY KEY (col1, col2)
      const pkMatch = line.match(/(?:CONSTRAINT\s+["`]?\w+["`]?\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const cols = pkMatch[1].split(',').map((c) => c.replace(/["`\s]/g, ''));
        cols.forEach((c) => pkColumnNames.add(c));
      }

      // FOREIGN KEY (col) REFERENCES other_table(other_col)
      const fkMatch = line.match(
        /(?:CONSTRAINT\s+["`]?\w+["`]?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+["`]?(\w+)["`]?\s*\(([^)]+)\)/i
      );
      if (fkMatch) {
        const srcCol = fkMatch[1].replace(/["`\s]/g, '');
        const targetTable = fkMatch[2].replace(/["`\s]/g, '');
        const targetCol = fkMatch[3].replace(/["`\s]/g, '');
        inlineFks.push({ sourceColName: srcCol, targetTable, targetCol });
      }
    }

    // Process column definitions
    for (const token of tokens) {
      const line = token.replace(/\s+/g, ' ').trim();
      if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE\s*\(|CHECK)/i.test(line)) {
        continue; // Handled separately
      }

      const colMatch = line.match(/^["`]?(\w+)["`]?\s+([A-Za-z0-9_]+(?:\([^)]+\))?)([\s\S]*)$/);
      if (colMatch) {
        const colName = colMatch[1];
        let colType = colMatch[2].toUpperCase();
        const rest = colMatch[3] || '';

        let typeModifier: string | undefined = undefined;
        if (colType.includes('(')) {
          const modMatch = colType.match(/\(([^)]+)\)/);
          if (modMatch) typeModifier = `(${modMatch[1]})`;
          colType = colType.replace(/\([^)]+\)/, '');
        }

        const isPkInline = /PRIMARY\s+KEY/i.test(rest);
        const isPk = isPkInline || pkColumnNames.has(colName);
        const isNullable = !/NOT\s+NULL/i.test(rest) && !isPk;
        const isUnique = /UNIQUE/i.test(rest) || isPk;

        let defaultValue: string | undefined = undefined;
        const defaultMatch = rest.match(/DEFAULT\s+([^,\s]+(?:\([^)]*\))?|'[^']*')/i);
        if (defaultMatch) {
          defaultValue = defaultMatch[1];
        }

        const colId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        columns.push({
          id: colId,
          name: colName,
          type: colType,
          typeModifier,
          isPrimaryKey: isPk,
          isNullable,
          isUnique,
          defaultValue,
        });

        // Inline REFERENCES table(col)
        const refMatch = rest.match(/REFERENCES\s+["`]?(\w+)["`]?\s*(?:\(["`]?(\w+)["`]?\))?/i);
        if (refMatch) {
          inlineFks.push({
            sourceColName: colName,
            targetTable: refMatch[1],
            targetCol: refMatch[2] || 'id',
          });
        }
      }
    }

    const colMap = new Map<string, string>();
    columns.forEach((c) => colMap.set(c.name.toLowerCase(), c.id));
    tableColLookup.set(tableName.toLowerCase(), { tableId, colMap });

    tables.push({
      id: tableId,
      name: tableName,
      x: 80 + (tableIndex - 1) * 360,
      y: 100 + ((tableIndex - 1) % 2) * 120,
      columns,
    });

    // Save inline FKs for resolution
    (tables[tables.length - 1] as any)._inlineFks = inlineFks;
  }

  // Parse standalone ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY
  const alterFkRegex = /ALTER\s+TABLE\s+(?:ONLY\s+)?["`]?(\w+)["`]?\s+ADD\s+CONSTRAINT\s+["`]?\w+["`]?\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+["`]?(\w+)["`]?\s*\(([^)]+)\)/gi;
  let alterMatch: RegExpExecArray | null;
  while ((alterMatch = alterFkRegex.exec(cleanSQL)) !== null) {
    const srcTable = alterMatch[1].toLowerCase();
    const srcCol = alterMatch[2].replace(/["`\s]/g, '').toLowerCase();
    const tgtTable = alterMatch[3].toLowerCase();
    const tgtCol = alterMatch[4].replace(/["`\s]/g, '').toLowerCase();

    const srcInfo = tableColLookup.get(srcTable);
    const tgtInfo = tableColLookup.get(tgtTable);
    if (srcInfo && tgtInfo) {
      const srcColId = srcInfo.colMap.get(srcCol);
      const tgtColId = tgtInfo.colMap.get(tgtCol);
      if (srcColId && tgtColId) {
        relationships.push({
          id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sourceTableId: srcInfo.tableId,
          sourceColumnId: srcColId,
          targetTableId: tgtInfo.tableId,
          targetColumnId: tgtColId,
          cardinality: '1:N',
          sourceOptionality: 'mandatory',
          targetOptionality: 'optional',
          onDelete: 'CASCADE',
        });
      }
    }
  }

  // Resolve inline FKs saved on tables
  for (const t of tables) {
    const inlineFks = (t as any)._inlineFks || [];
    const srcInfo = tableColLookup.get(t.name.toLowerCase());
    if (!srcInfo) continue;

    for (const fk of inlineFks) {
      const tgtInfo = tableColLookup.get(fk.targetTable.toLowerCase());
      if (tgtInfo) {
        const srcColId = srcInfo.colMap.get(fk.sourceColName.toLowerCase());
        const tgtColId = tgtInfo.colMap.get(fk.targetCol.toLowerCase());
        if (srcColId && tgtColId) {
          // Check if already added
          const already = relationships.some(
            (r) =>
              r.sourceTableId === srcInfo.tableId &&
              r.sourceColumnId === srcColId &&
              r.targetTableId === tgtInfo.tableId &&
              r.targetColumnId === tgtColId
          );
          if (!already) {
            relationships.push({
              id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              sourceTableId: srcInfo.tableId,
              sourceColumnId: srcColId,
              targetTableId: tgtInfo.tableId,
              targetColumnId: tgtColId,
              cardinality: '1:N',
              sourceOptionality: 'mandatory',
              targetOptionality: 'optional',
              onDelete: 'CASCADE',
            });
          }
        }
      }
    }
    delete (t as any)._inlineFks;
  }

  return { tables, relationships };
}

