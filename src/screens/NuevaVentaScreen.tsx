import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  IconButton,
  ActivityIndicator,
  Snackbar,
  Divider,
} from 'react-native-paper';
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
import { commonStyles, colores } from '../styles/commonStyles';

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
  const [error, setError] = useState<string | null>(null);

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
      setError('Carrito vacío');
      return;
    }
    if (!usuario) {
      setError('Selecciona un usuario');
      return;
    }
    setGuardando(true);
    setError(null);
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
        setError(
          `Stock insuficiente: ${validacion.producto_id} (disponible ${validacion.disponible})`
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
        forzada: false,
      });

      setCarrito([]);
      onCerrar(true);
    } catch (e: any) {
      setError(e.message ?? 'Error al registrar la venta');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <SafeAreaView style={[commonStyles.container, styles.fondo]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="titleLarge">Nueva venta</Text>
        <Text variant="bodyMedium" style={styles.usuario}>
          Usuario: {usuario}
        </Text>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={productos}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.listaProductos}
        renderItem={({ item }) => {
          const stockBajo = item.stock_mostrado <= 0;
          return (
            <Card
              style={styles.cardProducto}
              onPress={() => agregar(item)}
              mode="elevated"
            >
              <Card.Content>
                <View style={styles.filaProducto}>
                  <Text variant="titleMedium" style={styles.nombreProducto}>
                    {item.nombre}
                  </Text>
                  <Text
                    variant="labelLarge"
                    style={{ color: stockBajo ? colores.stockBajo : colores.stockOk }}
                  >
                    {item.stock_mostrado} disp.
                  </Text>
                </View>
                <Text variant="bodyMedium" style={styles.precioProducto}>
                  {item.precio.toFixed(2)} CUP
                </Text>
              </Card.Content>
            </Card>
          );
        }}
        ListEmptyComponent={
          <Text variant="bodyMedium" style={commonStyles.vacio}>
            No hay productos activos.
          </Text>
        }
      />

      <View style={styles.carrito}>
        <Text variant="titleMedium" style={styles.subtitulo}>
          Carrito
        </Text>
        {carrito.length === 0 && (
          <Text variant="bodyMedium" style={commonStyles.vacio}>
            (vacío)
          </Text>
        )}
        {carrito.map((item) => (
          <View key={item.producto_id} style={styles.filaCarrito}>
            <Text variant="bodyLarge" style={styles.nombreCarrito} numberOfLines={1}>
              {item.nombre}
            </Text>
            <IconButton
              icon="minus"
              size={20}
              onPress={() => cambiarCantidad(item.producto_id, -1)}
            />
            <Text variant="bodyLarge" style={styles.cantidad}>
              {item.cantidad}
            </Text>
            <IconButton
              icon="plus"
              size={20}
              onPress={() => cambiarCantidad(item.producto_id, +1)}
            />
            <Text variant="bodyMedium" style={styles.subtotal}>
              {(item.cantidad * item.precio_unitario).toFixed(2)}
            </Text>
          </View>
        ))}

        <Divider style={{ marginVertical: 8 }} />

        <View style={styles.filaTotal}>
          <Text variant="titleMedium">Total</Text>
          <Text variant="titleLarge" style={styles.total}>
            {total.toFixed(2)} CUP
          </Text>
        </View>

        <Button
          mode="contained"
          icon="check"
          onPress={confirmar}
          loading={guardando}
          disabled={guardando || carrito.length === 0}
          style={styles.botonConfirmar}
        >
          {guardando ? 'Guardando...' : 'Confirmar venta'}
        </Button>
        <Button mode="text" onPress={() => onCerrar(false)}>
          Cancelar
        </Button>
      </View>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError(null)}
        duration={4000}
        action={{ label: 'Cerrar', onPress: () => setError(null) }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fondo: { backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  usuario: { color: colores.textoSuave, marginTop: 2 },
  listaProductos: { paddingHorizontal: 16, paddingBottom: 8 },
  cardProducto: { marginBottom: 8 },
  filaProducto: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nombreProducto: { flex: 1, marginRight: 8 },
  precioProducto: { color: colores.textoSuave, marginTop: 2 },
  carrito: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
  },
  subtitulo: { marginBottom: 4 },
  filaCarrito: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  nombreCarrito: { flex: 1, marginRight: 4 },
  cantidad: { minWidth: 24, textAlign: 'center' },
  subtotal: { minWidth: 60, textAlign: 'right', color: colores.textoSuave },
  filaTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  total: { fontWeight: 'bold' },
  botonConfirmar: { marginTop: 8, marginBottom: 4 },
});