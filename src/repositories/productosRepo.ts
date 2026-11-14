import { getDb } from '../db/database';
import { Producto } from '../types';

export async function reemplazarProductos(productos: Producto[]): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
        await db.execAsync('DELETE FROM productos');
        for (const p of productos) {
            await db.runAsync(
                'INSERT INTO productos (id, nombre, precio, stock_actual, stock_minimo, activo) VALUES (?, ?, ?, ?, ?, ?)',
                [p.id, p.nombre, p.precio, p.stock_actual, p.stock_minimo, p.activo ? 1 : 0]
            );
        }
    });
}

export async function listarProductos(): Promise<Producto[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>('SELECT * FROM productos ORDER BY nombre');
    return rows.map(r => ({
        id: r.id,
        nombre: r.nombre,
        precio: r.precio,
        stock_actual: r.stock_actual,
        stock_minimo: r.stock_minimo,
        activo: r.activo === 1,
    }));
}

export type ProductoConStockMostrado = Producto & {
    stock_mostrado: number;
};

export async function listarProductosConStockMostrado(): Promise<ProductoConStockMostrado[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(`
    SELECT
      p.id, p.nombre, p.precio, p.stock_actual, p.stock_minimo, p.activo,
      COALESCE(SUM(
        CASE
          WHEN m.tipo = 'venta' THEN -m.cantidad
          WHEN m.tipo = 'entrada' THEN m.cantidad
          WHEN m.tipo = 'ajuste' THEN m.cantidad
          ELSE 0
        END
      ), 0) AS delta_pendiente
    FROM productos p
    LEFT JOIN movimientos_pendientes m ON m.producto_id = p.id
    GROUP BY p.id
    ORDER BY p.nombre
  `);

    return rows.map(r => ({
        id: r.id,
        nombre: r.nombre,
        precio: r.precio,
        stock_actual: r.stock_actual,
        stock_minimo: r.stock_minimo,
        activo: r.activo === 1,
        stock_mostrado: r.stock_actual + r.delta_pendiente,
    }));
}

export async function insertarProductoLocal(p: Producto): Promise<void> {
    const db = await getDb();
    await db.runAsync(
        `INSERT INTO productos (id, nombre, precio, stock_actual, stock_minimo, activo)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [p.id, p.nombre, p.precio, p.stock_actual, p.stock_minimo, p.activo ? 1 : 0]
    );
}

export async function actualizarProductoLocal(
    id: string,
    campos: Partial<Pick<Producto, 'nombre' | 'precio' | 'stock_minimo' | 'activo'>>
): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const valores: any[] = [];

    if (campos.nombre !== undefined) { sets.push('nombre = ?'); valores.push(campos.nombre); }
    if (campos.precio !== undefined) { sets.push('precio = ?'); valores.push(campos.precio); }
    if (campos.stock_minimo !== undefined) { sets.push('stock_minimo = ?'); valores.push(campos.stock_minimo); }
    if (campos.activo !== undefined) { sets.push('activo = ?'); valores.push(campos.activo ? 1 : 0); }

    if (sets.length === 0) return;
    valores.push(id);
    await db.runAsync(`UPDATE productos SET ${sets.join(', ')} WHERE id = ?`, valores);
}

export async function obtenerProducto(id: string): Promise<Producto | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<any>('SELECT * FROM productos WHERE id = ?', [id]);
    if (!row) return null;
    return {
        id: row.id,
        nombre: row.nombre,
        precio: row.precio,
        stock_actual: row.stock_actual,
        stock_minimo: row.stock_minimo,
        activo: row.activo === 1,
    };
}