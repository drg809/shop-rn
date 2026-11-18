import { appendMovimientos, leerIdsMovimientos, leerProductos, leerUsuarios } from '../api/sheetsApi';
import { reemplazarProductos } from '../repositories/productosRepo';
import { reemplazarUsuarios } from '../repositories/usuariosRepo';
import {
  listarPendientes,
  eliminarPendientes,
  marcarVentasSincronizadas,
} from '../repositories/movimientosPendientesRepo';
import { setMeta } from '../db/database';
import { Producto, Usuario } from '../types';

// Las hojas vienen como array de arrays: fila 0 = cabecera
function filaAProducto(row: any[]): Producto {
  return {
    id: String(row[0]),
    nombre: String(row[1]),
    precio: Number(row[2]) || 0,
    stock_actual: Number(row[3]) || 0,
    stock_minimo: Number(row[4]) || 0,
    activo: row[5] === true || row[5] === 'TRUE' || row[5] === 1,
  };
}

function filaAUsuario(row: any[]): Usuario {
  const rol = String(row[2] ?? '').toLowerCase();
  return {
    usuario: String(row[0]),
    activo: row[1] === true || row[1] === 'TRUE' || row[1] === 1,
    rol: rol === 'admin' ? 'admin' : 'vendedor',
  };
}

export async function sincronizarBajada(): Promise<{ productos: number; usuarios: number }> {
  const [rawProductos, rawUsuarios] = await Promise.all([
    leerProductos(),
    leerUsuarios(),
  ]);

  const productos = rawProductos.slice(1).filter(r => r[0]).map(filaAProducto);
  const usuarios = rawUsuarios.slice(1).filter(r => r[0]).map(filaAUsuario);

  await reemplazarProductos(productos);
  await reemplazarUsuarios(usuarios);
  await setMeta('ultima_sincronizacion', new Date().toISOString());

  return { productos: productos.length, usuarios: usuarios.length };
}

export type ResumenSync = {
  subidos: number;
  productos: number;
  usuarios: number;
};

export async function sincronizarCompleta(): Promise<ResumenSync> {
  // 1. Subir pendientes
  const pendientes = await listarPendientes();

  let subidos = 0;
  if (pendientes.length > 0) {
    // 1a. Leer IDs ya existentes en la hoja (idempotencia)
    const idsEnHoja = new Set(await leerIdsMovimientos());

    // 1b. Filtrar los que ya están arriba (evita duplicados si un intento anterior falló a medias)
    const yaSubidos = pendientes.filter(p => idsEnHoja.has(p.id_mov));
    const porSubir = pendientes.filter(p => !idsEnHoja.has(p.id_mov));

    if (yaSubidos.length > 0) {
      await eliminarPendientes(yaSubidos.map(p => p.id_mov));
      const idVentasYa = Array.from(new Set(yaSubidos.map(p => p.id_venta).filter(Boolean)));
      await marcarVentasSincronizadas(idVentasYa);
    }

    if (porSubir.length > 0) {
      const rows = porSubir.map(p => [
        p.id_mov,
        p.fecha,
        p.producto_id,
        p.tipo,
        p.cantidad,
        p.usuario,
        p.id_venta,
        p.device_id,
        'TRUE', // sincronizado
      ]);
      await appendMovimientos(rows);

      await eliminarPendientes(porSubir.map(p => p.id_mov));

      // Marcar ventas asociadas como sincronizadas
      const idVentas = Array.from(
        new Set(porSubir.map(p => p.id_venta).filter(Boolean))
      );
      await marcarVentasSincronizadas(idVentas);

      subidos = porSubir.length;
    }
  }

  // 2. Bajar estado actual
  const [rawProductos, rawUsuarios] = await Promise.all([
    leerProductos(),
    leerUsuarios(),
  ]);
  const productos = rawProductos.slice(1).filter(r => r[0]).map(filaAProducto);
  const usuarios = rawUsuarios.slice(1).filter(r => r[0]).map(filaAUsuario);

  await reemplazarProductos(productos);
  await reemplazarUsuarios(usuarios);
  await setMeta('ultima_sincronizacion', new Date().toISOString());

  return {
    subidos,
    productos: productos.length,
    usuarios: usuarios.length,
  };
}