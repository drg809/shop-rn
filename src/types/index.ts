export type Producto = {
  id: string;
  nombre: string;
  precio: number;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
};

export type Usuario = {
  usuario: string;
  activo: boolean;
  rol: 'admin' | 'vendedor';
};

export type Movimiento = {
  id_mov: string;
  fecha: string;
  producto_id: string;
  tipo: 'venta' | 'entrada' | 'ajuste';
  cantidad: number;
  usuario: string;
  id_venta: string;
  device_id: string;
  sincronizado: boolean;
};