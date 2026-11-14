import { getDb } from '../db/database';
import { Movimiento } from '../types';

export type LineaVenta = {
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
};

export type VentaInput = {
    id_venta: string;
    fecha: string;
    usuario: string;
    device_id: string;
    lineas: LineaVenta[];
    forzada: boolean;
};

export async function registrarVenta(input: VentaInput): Promise<void> {
    const db = await getDb();
    const total = input.lineas.reduce(
        (acc, l) => acc + l.cantidad * l.precio_unitario,
        0
    );

    await db.withTransactionAsync(async () => {
        await db.runAsync(
            `INSERT INTO ventas_local (id_venta, fecha, usuario, total, num_lineas, sincronizada, forzada)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
            [
                input.id_venta,
                input.fecha,
                input.usuario,
                total,
                input.lineas.length,
                input.forzada ? 1 : 0,
            ]
        );

        for (const linea of input.lineas) {
            const idMov = `${input.id_venta}-${linea.producto_id}-${Math.random().toString(36).slice(2, 6)}`;
            await db.runAsync(
                `INSERT INTO movimientos_pendientes
         (id_mov, fecha, producto_id, tipo, cantidad, usuario, id_venta, device_id)
         VALUES (?, ?, ?, 'venta', ?, ?, ?, ?)`,
                [
                    idMov,
                    input.fecha,
                    linea.producto_id,
                    linea.cantidad,
                    input.usuario,
                    input.id_venta,
                    input.device_id,
                ]
            );
        }
    });
}

export async function validarStockDisponible(
    lineas: LineaVenta[],
    permitirSinStock: boolean
): Promise<{ ok: true } | { ok: false; producto_id: string; disponible: number }> {
    if (permitirSinStock) return { ok: true };

    const db = await getDb();
    for (const linea of lineas) {
        const row = await db.getFirstAsync<{ stock_mostrado: number }>(`
      SELECT
        p.stock_actual + COALESCE(SUM(
          CASE
            WHEN m.tipo = 'venta' THEN -m.cantidad
            WHEN m.tipo = 'entrada' THEN m.cantidad
            WHEN m.tipo = 'ajuste' THEN m.cantidad
            ELSE 0
          END
        ), 0) AS stock_mostrado
      FROM productos p
      LEFT JOIN movimientos_pendientes m ON m.producto_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `, [linea.producto_id]);

        const disponible = row?.stock_mostrado ?? 0;
        if (disponible < linea.cantidad) {
            return { ok: false, producto_id: linea.producto_id, disponible };
        }
    }
    return { ok: true };
}

export async function registrarAjuste(input: {
    producto_id: string;
    cantidad: number;
    usuario: string;
    device_id: string;
    motivo?: string;
}): Promise<void> {
    const db = await getDb();
    const idMov = 'AJ-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    await db.runAsync(
        `INSERT INTO movimientos_pendientes
     (id_mov, fecha, producto_id, tipo, cantidad, usuario, id_venta, device_id)
     VALUES (?, ?, ?, 'ajuste', ?, ?, '', ?)`,
        [idMov, new Date().toISOString(), input.producto_id,
            input.cantidad, input.usuario, input.device_id]
    );
}