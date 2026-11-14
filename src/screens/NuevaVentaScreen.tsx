import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Button,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  listarProductosConStockMostrado,
  ProductoConStockMostrado,
} from '../repositories/productosRepo';
import {
  registrarVenta,
  validarStockDisponible,
  LineaVenta,
} from '../repositories/ventasRepo';
import { getMeta, getOrCreateDeviceId } from '../db/database';

type Props = {
  onCerrar: (huboVenta?: boolean) => void;
};

type CarritoItem = {
  producto_id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  stock_mostrado: number;
};

export default function NuevaVentaScreen({ onCerrar }: Props) {
  const [productos, setProductos] = useState<ProductoConStockMostrado[]>([]);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [usuario, setUsuario] = useState<string>('admin');
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    const lista = await listarProductosConStockMostrado();
    setProductos(lista.filter((p) => p.activo));
    const usuarioGuardado = await getMeta('usuario_actual');
    if (usuarioGuardado) setUsuario(usuarioGuardado);
  }

  useEffect(() => {
    cargar();
  }, []);

  function agregar(p: ProductoConStockMostrado) {
    setCarrito((prev) => {
      const existente = prev.find((x) => x.producto_id === p.id);
      if (existente) {
        return prev.map((x) =>
          x.producto_id === p.id ? { ...x, cantidad: x.cantidad + 1 } : x
        );
      }
      return [
        ...prev,
        {
          producto_id: p.id,
          nombre: p.nombre,
          precio_unitario: p.precio,
          cantidad: 1,
          stock_mostrado: p.stock_mostrado,
        },
      ];
    });
  }

  function cambiarCantidad(producto_id: string, delta: number) {
    setCarrito((prev) =>
      prev
        .map((x) =>
          x.producto_id === producto_id
            ? { ...x, cantidad: x.cantidad + delta }
            : x
        )
        .filter((x) => x.cantidad > 0)
    );
  }

  const total = carrito.reduce(
    (acc, x) => acc + x.cantidad * x.precio_unitario,
    0
  );

  async function confirmar() {
    if (carrito.length === 0) {
      Alert.alert('Carrito vacío');
      return;
    }
    if (!usuario) {
      Alert.alert('Selecciona un usuario');
      return;
    }
    setGuardando(true);
    try {
      const lineas: LineaVenta[] = carrito.map((x) => ({
        producto_id: x.producto_id,
        cantidad: x.cantidad,
        precio_unitario: x.precio_unitario,
      }));

      const permitirSinStock =
        (await getMeta('permitir_venta_sin_stock')) === 'true';

      const validacion = await validarStockDisponible(lineas, permitirSinStock);
      if (!validacion.ok) {
        Alert.alert(
          'Stock insuficiente',
          `Producto ${validacion.producto_id}: disponible ${validacion.disponible}`
        );
        setGuardando(false);
        return;
      }

      const device_id = await getOrCreateDeviceId();
      const id_venta =
        'V-' + Math.random().toString(36).slice(2, 10).toUpperCase();

      await registrarVenta({
        id_venta,
        fecha: new Date().toISOString(),
        usuario,
        device_id,
        lineas,
        forzada: false, // si llegamos aquí, la validación pasó
      });

      Alert.alert(
        'Venta registrada',
        `ID: ${id_venta}\nTotal: ${total.toFixed(2)} CUP`
      );
      setCarrito([]);
      onCerrar(true); // ← indica que hubo venta
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  }

  function cancelar() {
    onCerrar(false); // ← indica que no hubo venta
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.titulo}>Nueva venta</Text>
      <Text>Usuario: {usuario}</Text>

      <FlatList
        style={{ flex: 1 }}
        data={productos}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.filaProducto}
            onPress={() => agregar(item)}
          >
            <Text>{item.nombre}</Text>
            <Text>
              {item.stock_mostrado} disp. | {item.precio} CUP
            </Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.carrito}>
        <Text style={styles.subtitulo}>Carrito</Text>
        {carrito.length === 0 && <Text>(vacío)</Text>}
        {carrito.map((item) => (
          <View key={item.producto_id} style={styles.filaCarrito}>
            <Text style={{ flex: 1 }}>{item.nombre}</Text>
            <Button
              title="−"
              onPress={() => cambiarCantidad(item.producto_id, -1)}
            />
            <Text style={{ marginHorizontal: 8 }}>{item.cantidad}</Text>
            <Button
              title="+"
              onPress={() => cambiarCantidad(item.producto_id, +1)}
            />
          </View>
        ))}
        <Text style={styles.total}>
          Total: {total.toFixed(2)} CUP
        </Text>
        <Button
          title={guardando ? 'Guardando...' : 'Confirmar venta'}
          onPress={confirmar}
          disabled={guardando || carrito.length === 0}
        />
        <Button title="Cancelar" onPress={cancelar} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  subtitulo: { fontSize: 16, fontWeight: 'bold', marginVertical: 8 },
  filaProducto: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  carrito: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ccc' },
  filaCarrito: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  total: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 8,
    textAlign: 'right',
  },
});