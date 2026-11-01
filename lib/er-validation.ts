import { ERTable, ERRelationship, ValidationIssue } from '@/types/er';

// Check if two PostgreSQL data types are compatible for a Foreign Key relationship
export function areTypesCompatible(typeA: string, typeB: string): boolean {
  const normA = typeA.trim().toUpperCase();
  const normB = typeB.trim().toUpperCase();

  if (normA === normB) return true;

  // Numeric id compatibility: SERIAL is INTEGER, BIGSERIAL is BIGINT
  const integerGroup = ['INTEGER', 'INT', 'INT4', 'SERIAL', 'SMALLINT'];
  const bigintGroup = ['BIGINT', 'INT8', 'BIGSERIAL'];
  const stringGroup = ['VARCHAR', 'TEXT', 'CHAR'];
  const uuidGroup = ['UUID'];

  const matchGroup = (grp: string[], a: string, b: string) =>
    grp.some((g) => a.startsWith(g)) && grp.some((g) => b.startsWith(g));

  if (matchGroup(integerGroup, normA, normB)) return true;
  if (matchGroup(bigintGroup, normA, normB)) return true;
  if (matchGroup(stringGroup, normA, normB)) return true;
  if (matchGroup(uuidGroup, normA, normB)) return true;

  // Cross int/bigint is allowed but may give warning
  if (
    (integerGroup.some((g) => normA.startsWith(g)) && bigintGroup.some((g) => normB.startsWith(g))) ||
    (bigintGroup.some((g) => normA.startsWith(g)) && integerGroup.some((g) => normB.startsWith(g)))
  ) {
    return true; // Technically castable in Postgres with caution
  }

  return false;
}

// Validate the entire diagram model
export function validateERDiagram(
  tables: ERTable[],
  relationships: ERRelationship[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const tableMap = new Map(tables.map((t) => [t.id, t]));

  // 1. Table validations
  for (const table of tables) {
    // Check if table has a primary key
    const pkColumns = table.columns.filter((c) => c.isPrimaryKey);
    if (pkColumns.length === 0) {
      issues.push({
        id: `pk-missing-${table.id}`,
        severity: 'warning',
        title: 'Missing Primary Key',
        message: `Table "${table.name}" does not have a primary key column defined.`,
        tableId: table.id,
      });
    }

    // Check for duplicate column names in the same table
    const colNames = new Set<string>();
    for (const col of table.columns) {
      const lower = col.name.trim().toLowerCase();
      if (colNames.has(lower)) {
        issues.push({
          id: `col-dup-${table.id}-${col.id}`,
          severity: 'error',
          title: 'Duplicate Column Name',
          message: `Table "${table.name}" has multiple columns named "${col.name}".`,
          tableId: table.id,
          columnId: col.id,
        });
      } else {
        colNames.add(lower);
      }
    }
  }

  // 2. Relationship validations
  const relPairs = new Set<string>();
  for (const rel of relationships) {
    const sourceTable = tableMap.get(rel.sourceTableId);
    const targetTable = tableMap.get(rel.targetTableId);

    if (!sourceTable) {
      issues.push({
        id: `rel-nosrc-${rel.id}`,
        severity: 'error',
        title: 'Missing Source Table',
        message: `Relationship references a source table that no longer exists.`,
        relationshipId: rel.id,
      });
      continue;
    }

    if (!targetTable) {
      issues.push({
        id: `rel-notgt-${rel.id}`,
        severity: 'error',
        title: 'Missing Target Table',
        message: `Relationship references a target table that no longer exists.`,
        relationshipId: rel.id,
      });
      continue;
    }

    const sourceCol = sourceTable.columns.find((c) => c.id === rel.sourceColumnId);
    const targetCol = targetTable.columns.find((c) => c.id === rel.targetColumnId);

    if (!sourceCol) {
      issues.push({
        id: `rel-nosrccol-${rel.id}`,
        severity: 'error',
        title: 'Missing Foreign Key Column',
        message: `Foreign key column not found on table "${sourceTable.name}".`,
        relationshipId: rel.id,
        tableId: sourceTable.id,
      });
      continue;
    }

    if (!targetCol) {
      issues.push({
        id: `rel-notgtcol-${rel.id}`,
        severity: 'error',
        title: 'Missing Referenced Column',
        message: `Referenced column not found on table "${targetTable.name}".`,
        relationshipId: rel.id,
        tableId: targetTable.id,
      });
      continue;
    }

    // Type Compatibility Check
    if (!areTypesCompatible(sourceCol.type, targetCol.type)) {
      issues.push({
        id: `rel-type-mismatch-${rel.id}`,
        severity: 'error',
        title: 'Incompatible Column Types',
        message: `Type mismatch between ${sourceTable.name}.${sourceCol.name} (${sourceCol.type}) and ${targetTable.name}.${targetCol.name} (${targetCol.type}).`,
        relationshipId: rel.id,
        tableId: sourceTable.id,
        columnId: sourceCol.id,
      });
    }

    // Check if referenced column is a Primary Key or Unique
    if (!targetCol.isPrimaryKey && !targetCol.isUnique) {
      issues.push({
        id: `rel-not-pk-${rel.id}`,
        severity: 'warning',
        title: 'Target Column Not Unique',
        message: `Foreign keys should reference a Primary Key or UNIQUE column. "${targetTable.name}.${targetCol.name}" is neither.`,
        relationshipId: rel.id,
        tableId: targetTable.id,
        columnId: targetCol.id,
      });
    }

    // Duplicate relationship check
    const pairKey = `${rel.sourceTableId}:${rel.sourceColumnId}->${rel.targetTableId}:${rel.targetColumnId}`;
    if (relPairs.has(pairKey)) {
      issues.push({
        id: `rel-dup-${rel.id}`,
        severity: 'warning',
        title: 'Duplicate Relationship',
        message: `Duplicate relationship between ${sourceTable.name}.${sourceCol.name} and ${targetTable.name}.${targetCol.name}.`,
        relationshipId: rel.id,
      });
    } else {
      relPairs.add(pairKey);
    }
  }

  return issues;
}

