import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { PaperProvider, Button, Menu, IconButton } from 'react-native-paper';

import ProductosScreen from './src/screens/ProductosScreen';
import NuevaVentaScreen from './src/screens/NuevaVentaScreen';
import PendientesScreen from './src/screens/PendientesScreen';
import EditarProductoScreen from './src/screens/EditarProductoScreen';
import AjustesScreen from './src/screens/AjustesScreen';
import { contarGruposPendientes } from './src/repositories/movimientosPendientesRepo';
import { getMeta, setMeta } from './src/db/database';
import { theme } from './src/theme';
import { commonStyles } from './src/styles/commonStyles';
import { listarUsuarios } from './src/repositories/usuariosRepo';

type Pantalla = 'productos' | 'venta' | 'pendientes' | 'editarProducto' | 'ajustes';

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('productos');
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendientesCount, setPendientesCount] = useState(0);
  const [productoEditando, setProductoEditando] = useState<string | undefined>(undefined);
  const [rol, setRol] = useState<string>('vendedor');
  const [menuVisible, setMenuVisible] = useState(false);

  async function refrescarContador() {
    setPendientesCount(await contarGruposPendientes());
  }

  async function refrescarRol() {
    const usuarioActual = (await getMeta('usuario_actual')) ?? 'admin';
    const usuarios = await listarUsuarios();
    const encontrado = usuarios.find(u => u.usuario === usuarioActual);
    const rolReal = encontrado?.rol ?? 'vendedor';
    setRol(rolReal);
  }

  useEffect(() => {
    refrescarContador();
    refrescarRol();
  }, [pantalla]);

  function cerrarVenta(huboVenta?: boolean) {
    setPantalla('productos');
    if (huboVenta) {
      setRefreshKey(k => k + 1);
      refrescarContador();
    }
  }

  // Guard: si el rol no es admin y la pantalla es protegida, redirigir a productos
  const esAdmin = rol === 'admin';
  const pantallaProtegida = pantalla === 'editarProducto' || pantalla === 'ajustes';
  const pantallaEfectiva: Pantalla = pantallaProtegida && !esAdmin ? 'productos' : pantalla;

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        {pantallaEfectiva === 'venta' ? (
          <NuevaVentaScreen onCerrar={cerrarVenta} />
        ) : pantallaEfectiva === 'pendientes' ? (
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
        ) : pantallaEfectiva === 'editarProducto' && esAdmin ? (
          <EditarProductoScreen
            productoId={productoEditando}
            onCerrar={(huboCambios) => {
              setProductoEditando(undefined);
              setPantalla('productos');
              if (huboCambios) setRefreshKey(k => k + 1);
            }}
          />
        ) : pantallaEfectiva === 'ajustes' && esAdmin ? (
          <AjustesScreen onVolver={() => setPantalla('productos')} />
        ) : pantallaEfectiva === 'productos' ? (
          <SafeAreaView
            style={[commonStyles.container, commonStyles.bkgApp]}
            edges={['top', 'bottom']}
          >
            <View style={commonStyles.container}>
              <View style={commonStyles.container}>
                <ProductosScreen
                  refreshKey={refreshKey}
                  onNuevoProducto={() => {
                    if (!esAdmin) return;
                    setProductoEditando(undefined);
                    setPantalla('editarProducto');
                  }}
                  onEditarProducto={(id) => {
                    if (!esAdmin) return;
                    setProductoEditando(id);
                    setPantalla('editarProducto');
                  }}
                  onSyncTerminada={() => {
                    refrescarRol();
                    refrescarContador();
                    setRefreshKey(k => k + 1);
                  }}
                />
              </View>
              <View style={commonStyles.barraInferior}>
                <View style={styles.filaBotones}>
                  <Button
                    mode="contained"
                    icon="cart"
                    onPress={() => setPantalla('venta')}
                    style={styles.botonPrincipal}
                  >
                    Nueva venta
                  </Button>
                  <Button
                    mode="outlined"
                    icon="tray-full"
                    onPress={() => setPantalla('pendientes')}
                    style={styles.botonPrincipal}
                  >
                    Pendientes ({pendientesCount})
                  </Button>
                  {esAdmin && (
                    <Menu
                      visible={menuVisible}
                      onDismiss={() => setMenuVisible(false)}
                      anchor={
                        <IconButton
                          icon="dots-vertical"
                          size={24}
                          onPress={() => setMenuVisible(true)}
                        />
                      }
                    >
                      <Menu.Item
                        onPress={() => {
                          setMenuVisible(false);
                          setPantalla('ajustes');
                        }}
                        title="Ajustes"
                        leadingIcon="cog"
                      />
                    </Menu>
                  )}
                </View>
              </View>
            </View>
          </SafeAreaView>
        ) : null}
      </SafeAreaProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  filaBotones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  botonPrincipal: { flex: 1 },
});