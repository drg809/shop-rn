import React, { useEffect, useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import ProductosScreen from './src/screens/ProductosScreen';
import NuevaVentaScreen from './src/screens/NuevaVentaScreen';
import PendientesScreen from './src/screens/PendientesScreen';
import { contarPendientes } from './src/repositories/movimientosPendientesRepo';
import EditarProductoScreen from './src/screens/EditarProductoScreen';

type Pantalla = 'productos' | 'venta' | 'pendientes' | 'editarProducto';

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('productos');
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendientesCount, setPendientesCount] = useState(0);
  const [productoEditando, setProductoEditando] = useState<string | undefined>(undefined);

  async function refrescarContador() {
    setPendientesCount(await contarPendientes());
  }

  useEffect(() => {
    refrescarContador();
  }, [pantalla]);

  function cerrarVenta(huboVenta?: boolean) {
    setPantalla('productos');
    if (huboVenta) {
      setRefreshKey(k => k + 1);
      refrescarContador();
    };
  }

  return (
    <SafeAreaProvider>
      {pantalla === 'venta' ? (
        <NuevaVentaScreen onCerrar={cerrarVenta} />
      ) : pantalla === 'pendientes' ? (
        <PendientesScreen
          onVolver={() => {
            setPantalla('productos');
            setRefreshKey(k => k + 1);
          }}
          onSyncTerminada={() => {
            refrescarContador();
            setRefreshKey(k => k + 1);
          }}
        />
      ) : pantalla === 'editarProducto' ? (
        <EditarProductoScreen
          productoId={productoEditando}
          onCerrar={(huboCambios) => {
            setProductoEditando(undefined);
            setPantalla('productos');
            if (huboCambios) setRefreshKey(k => k + 1);
          }}
        />
      ) : pantalla === 'productos' ? (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.container}>
            <View style={styles.contenido}>
              <ProductosScreen
                refreshKey={refreshKey}
                onNuevoProducto={() => {
                  setProductoEditando(undefined);
                  setPantalla('editarProducto');
                }}
                onEditarProducto={(id) => {
                  setProductoEditando(id);
                  setPantalla('editarProducto');
                }}
              />
            </View>
            <View style={styles.barraInferior}>
              <Button title="Nueva venta" onPress={() => setPantalla('venta')} />
              <View style={{ height: 8 }} />
              <Button
                title={`Pendientes (${pendientesCount})`}
                onPress={() => setPantalla('pendientes')}
              />
            </View>
          </View>
        </SafeAreaView>
      ) : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  contenido: { flex: 1 },
  barraInferior: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
});