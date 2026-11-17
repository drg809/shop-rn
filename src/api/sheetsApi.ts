import { WEB_APP_URL, TOKEN } from '../config/constants';
import { Producto } from '../types';

async function get(action: string): Promise<any> {
    const url = `${WEB_APP_URL}?action=${action}&token=${TOKEN}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== 'ok') {
        throw new Error(json.message || 'Error desconocido');
    }
    return json.data;
}

async function post(payload: object): Promise<any> {
    const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ...payload, token: TOKEN }),
    });

    const json = await res.json();
    if (json.status !== 'ok') {
        throw new Error(json.message || 'Error desconocido');
    }
    return json;
}

export async function leerProductos(): Promise<any[][]> {
    return get('leerProductos');
}

export async function leerUsuarios(): Promise<any[][]> {
    return get('leerUsuarios');
}

export async function leerIdsMovimientos(): Promise<string[]> {
    const data = await get('leerIdsMovimientos');
    return (data as any[][]).map(row => String(row[0]));
}

export async function appendMovimientos(rows: any[][]): Promise<void> {
    await post({ action: 'appendMovimientos', rows });
}

export async function crearProducto(fila: Producto): Promise<void> {
  await post({ action: 'crearProducto', fila });
}

export async function actualizarProducto(
  producto_id: string,
  columna: 'nombre' | 'precio' | 'stock_minimo' | 'activo',
  valor: any
): Promise<void> {
  await post({ action: 'actualizarProducto', producto_id, columna, valor });
}