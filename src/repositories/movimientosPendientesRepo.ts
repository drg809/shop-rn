import { getDb } from '../db/database';
import { Movimiento } from '../types';

export async function listarPendientes(): Promise<Movimiento[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM movimientos_pendientes ORDER BY fecha'
  );
  return rows.map(r => ({
    id_mov: r.id_mov,
    fecha: r.fecha,
    producto_id: r.producto_id,
    tipo: r.tipo,
    cantidad: r.cantidad,
    usuario: r.usuario,
    id_venta: r.id_venta,
    device_id: r.device_id,
    sincronizado: false,
  }));
}

export async function contarGruposPendientes(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(`
    SELECT COUNT(*) as total FROM (
      SELECT COALESCE(id_venta, id_mov) as grupo
      FROM movimientos_pendientes
      GROUP BY grupo
    )
  `);
  return row?.total ?? 0;
}

export async function contarPendientes(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) as n FROM movimientos_pendientes'
  );
  return row?.n ?? 0;
}

export async function eliminarPendientes(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `DELETE FROM movimientos_pendientes WHERE id_mov IN (${placeholders})`,
    ids
  );
}

export async function marcarVentasSincronizadas(idVentas: string[]): Promise<void> {
  if (idVentas.length === 0) return;
  const db = await getDb();
  const placeholders = idVentas.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE ventas_local SET sincronizada = 1 WHERE id_venta IN (${placeholders})`,
    idVentas
  );
}