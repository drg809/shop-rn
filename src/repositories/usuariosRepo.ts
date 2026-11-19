import { getDb } from '../db/database';
import { Usuario } from '../types';

export async function reemplazarUsuarios(usuarios: Usuario[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM usuarios');
    for (const u of usuarios) {
      await db.runAsync(
        `INSERT INTO usuarios (usuario, activo, rol) VALUES (?, ?, ?)`,
        [u.usuario, u.activo ? 1 : 0, u.rol]
      );
    }
  });
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT usuario, activo, rol FROM usuarios');
  return rows.map(r => ({ usuario: r.usuario, activo: r.activo === 1, rol: r.rol }));
}