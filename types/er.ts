export type PostgresDataType =
  | 'UUID'
  | 'INTEGER'
  | 'BIGINT'
  | 'SMALLINT'
  | 'SERIAL'
  | 'BIGSERIAL'
  | 'VARCHAR'
  | 'TEXT'
  | 'BOOLEAN'
  | 'DATE'
  | 'TIMESTAMP'
  | 'TIMESTAMPTZ'
  | 'NUMERIC'
  | 'DECIMAL'
  | 'JSONB'
  | 'JSON'
  | 'BYTEA'
  | 'INET';

export const COMMON_DATA_TYPES: { type: PostgresDataType; category: string; description: string }[] = [
  { type: 'UUID', category: 'Identifier', description: '128-bit universally unique identifier' },
  { type: 'SERIAL', category: 'Identifier', description: 'Auto-incrementing 4-byte integer' },
  { type: 'BIGSERIAL', category: 'Identifier', description: 'Auto-incrementing 8-byte integer' },
  { type: 'INTEGER', category: 'Numeric', description: 'Signed 4-byte integer (-2B to +2B)' },
  { type: 'BIGINT', category: 'Numeric', description: 'Signed 8-byte integer' },
  { type: 'SMALLINT', category: 'Numeric', description: 'Signed 2-byte integer (-32k to +32k)' },
  { type: 'NUMERIC', category: 'Numeric', description: 'Exact numeric of selectable precision' },
  { type: 'DECIMAL', category: 'Numeric', description: 'Exact numeric alias' },
  { type: 'VARCHAR', category: 'String', description: 'Variable-length character string' },
  { type: 'TEXT', category: 'String', description: 'Variable unlimited length string' },
  { type: 'BOOLEAN', category: 'Logical', description: 'True or False state' },
  { type: 'TIMESTAMP', category: 'Date/Time', description: 'Date and time without timezone' },
  { type: 'TIMESTAMPTZ', category: 'Date/Time', description: 'Date and time with timezone' },
  { type: 'DATE', category: 'Date/Time', description: 'Calendar date (year, month, day)' },
  { type: 'JSONB', category: 'Semi-structured', description: 'Binary decomposed JSON data' },
  { type: 'JSON', category: 'Semi-structured', description: 'Textual JSON data' },
  { type: 'BYTEA', category: 'Binary', description: 'Binary data byte array' },
  { type: 'INET', category: 'Network', description: 'IPv4 or IPv6 host address' },
];

export interface ERColumn {
  id: string;
  name: string;
  type: PostgresDataType | string;
  typeModifier?: string; // e.g. (255) for VARCHAR(255) or (10, 2)
  isPrimaryKey: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean;
  isNullable: boolean; // false = NOT NULL
  defaultValue?: string;
  comment?: string;
}

export interface ERIndex {
  id: string;
  name: string;
  columnIds: string[];
  isUnique: boolean;
  method: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface ERTable {
  id: string;
  name: string;
  description?: string;
  x: number;
  y: number;
  width?: number;
  headerColor?: string;
  columns: ERColumn[];
  indexes?: ERIndex[];
  isMinimized?: boolean;
}

export type Cardinality = '1:1' | '1:N' | 'M:N';
export type Optionality = 'mandatory' | 'optional';
export type ReferentialAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

export interface ERRelationship {
  id: string;
  name?: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  cardinality: Cardinality;
  sourceOptionality?: Optionality; // e.g. 0..1 (optional) or 1..1 (mandatory)
  targetOptionality?: Optionality; // e.g. 0..N (optional) or 1..N (mandatory)
  onDelete?: ReferentialAction;
  onUpdate?: ReferentialAction;
  customWaypoints?: { x: number; y: number }[];
}

export interface ERDiagram {
  id: string;
  name: string;
  description?: string;
  tables: ERTable[];
  relationships: ERRelationship[];
  createdAt: number;
  updatedAt: number;
}

export interface ERViewSettings {
  showDataTypes: boolean;
  showConstraints: boolean;
  showIndexes: boolean;
  showDescriptions: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  tableId?: string;
  columnId?: string;
  relationshipId?: string;
}

