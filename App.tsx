import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { PaperProvider, Button, Text } from 'react-native-paper';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';

import ProductosScreen from './src/screens/ProductosScreen';
import NuevaVentaScreen from './src/screens/NuevaVentaScreen';
import PendientesScreen from './src/screens/PendientesScreen';
import { contarGruposPendientes } from './src/repositories/movimientosPendientesRepo';
import EditarProductoScreen from './src/screens/EditarProductoScreen';
import { theme } from './theme';
import { commonStyles, colores } from './src/styles/commonStyles';

type Pantalla = 'productos' | 'venta' | 'pendientes' | 'editarProducto';

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('productos');
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendientesCount, setPendientesCount] = useState(0);
  const [productoEditando, setProductoEditando] = useState<string | undefined>(undefined);
  const { isOnline } = useNetworkStatus();

  async function refrescarContador() {
    setPendientesCount(await contarGruposPendientes());
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
    <PaperProvider theme={theme}>
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
          <SafeAreaView style={[commonStyles.container, commonStyles.bkgApp]} edges={['top', 'bottom']}>
            <View style={commonStyles.container}>
              <View style={commonStyles.container}>
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
              <View style={commonStyles.indicadorRed}>
                <View style={[commonStyles.punto, { backgroundColor: isOnline ? colores.stockOk : colores.stockBajo }]} />
                <Text variant="labelSmall" style={{ color: colores.textoSuave }}>
                  {isOnline ? 'En línea' : 'Sin conexión'}
                </Text>
              </View>
              <View style={commonStyles.barraInferior}>
                <Button
                  mode="contained"
                  icon="cart"
                  onPress={() => setPantalla('venta')}
                  style={{ marginBottom: 8 }}
                >
                  Nueva venta
                </Button>
                <Button
                  mode="outlined"
                  icon="tray-full"
                  onPress={() => setPantalla('pendientes')}
                >
                  Pendientes ({pendientesCount})
                </Button>
              </View>
            </View>
          </SafeAreaView>
        ) : null}
      </SafeAreaProvider>
    </PaperProvider>
  );
}
