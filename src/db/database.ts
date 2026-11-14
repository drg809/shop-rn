import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from '../types/schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('tienda.db');
  await db.execAsync(CREATE_TABLES_SQL);
  return db;
}

// Helpers para meta (device_id, última sincronización, etc.)
export async function getMeta(clave: string): Promise<string | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ valor: string }>(
    'SELECT valor FROM meta WHERE clave = ?',
    [clave]
  );
  return row?.valor ?? null;
}

export async function setMeta(clave: string, valor: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'INSERT INTO meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
    [clave, valor]
  );
}

// Genera y persiste un device_id la primera vez
export async function getOrCreateDeviceId(): Promise<string> {
  let id = await getMeta('device_id');
  if (!id) {
    id = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    await setMeta('device_id', id);
  }
  return id;
}