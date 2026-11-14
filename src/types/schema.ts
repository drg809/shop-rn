export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS productos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    stock_actual REAL NOT NULL DEFAULT 0,
    stock_minimo REAL NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    usuario TEXT PRIMARY KEY,
    activo INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS movimientos_pendientes (
    id_mov TEXT PRIMARY KEY,
    fecha TEXT NOT NULL,
    producto_id TEXT NOT NULL,
    tipo TEXT NOT NULL,
    cantidad REAL NOT NULL,
    usuario TEXT NOT NULL,
    id_venta TEXT,
    device_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ventas_local (
    id_venta TEXT PRIMARY KEY,
    fecha TEXT NOT NULL,
    usuario TEXT NOT NULL,
    total REAL NOT NULL,
    num_lineas INTEGER NOT NULL,
    sincronizada INTEGER NOT NULL DEFAULT 0,
    forzada INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS meta (
    clave TEXT PRIMARY KEY,
    valor TEXT
  );
`;