import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  listarPendientes,
} from '../repositories/movimientosPendientesRepo';
import { sincronizarCompleta } from '../services/syncService';
import { Movimiento } from '../types';
import { commonStyles, colores } from '../styles/commonStyles';

type Props = {
  onVolver: () => void;
  onSyncTerminada?: (subidos: number) => void;
};

export default function PendientesScreen({ onVolver, onSyncTerminada }: Props) {
  const [pendientes, setPendientes] = useState<Movimiento[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  async function cargar() {
    setPendientes(await listarPendientes());
  }

  useEffect(() => {
    cargar();
  }, []);

  async function sincronizar() {
    setSincronizando(true);
    setError(null);
    setExito(null);
    try {
      const resumen = await sincronizarCompleta();
      setExito(
        `Sincronización completada: ${resumen.subidos} movimientos, ${resumen.productos} productos, ${resumen.usuarios} usuarios`
      );
      await cargar();
      onSyncTerminada?.(resumen.subidos);
    } catch (e: any) {
      setError(e.message ?? 'Error al sincronizar');
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <SafeAreaView style={[commonStyles.container, styles.fondo]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="titleLarge">Pendientes ({pendientes.length})</Text>
        <Text variant="bodyMedium" style={styles.subtitulo}>
          Movimientos sin sincronizar con la hoja
        </Text>
      </View>

      {sincronizando && pendientes.length === 0 ? (
        <View style={commonStyles.centrado}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={{ marginTop: 8, color: colores.textoSuave }}>
            Sincronizando...
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendientes}
          keyExtractor={(p) => p.id_mov}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <Card style={commonStyles.card} mode="elevated">
              <Card.Content>
                <View style={styles.filaTipo}>
                  <Text variant="titleMedium">
                    {item.tipo.toUpperCase()}
                  </Text>
                  <Text variant="labelLarge" style={styles.cantidad}>
                    {item.cantidad}
                  </Text>
                </View>
                <Text variant="bodyMedium" style={commonStyles.detalle}>
                  Producto: {item.producto_id}
                </Text>
                <Text variant="bodySmall" style={styles.fecha}>
                  {item.fecha}
                </Text>
                {item.id_venta ? (
                  <Text variant="bodySmall" style={styles.venta}>
                    Venta: {item.id_venta}
                  </Text>
                ) : null}
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <Text variant="bodyMedium" style={commonStyles.vacio}>
              No hay movimientos pendientes.
            </Text>
          }
        />
      )}

      <View style={commonStyles.barraInferior}>
        <Button
          mode="contained"
          icon="sync"
          onPress={sincronizar}
          loading={sincronizando}
          disabled={sincronizando || pendientes.length === 0}
          style={{ marginBottom: 8 }}
        >
          {sincronizando ? 'Sincronizando...' : 'Sincronizar todo'}
        </Button>
        <Button mode="outlined" onPress={onVolver}>
          Volver
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

      <Snackbar
        visible={!!exito}
        onDismiss={() => setExito(null)}
        duration={4000}
        action={{ label: 'OK', onPress: () => setExito(null) }}
        style={{ backgroundColor: colores.stockOk }}
      >
        {exito}
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
  subtitulo: { color: colores.textoSuave, marginTop: 2 },
  lista: { paddingHorizontal: 16, paddingBottom: 16 },
  filaTipo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cantidad: {
    fontWeight: 'bold',
    color: colores.stockOk,
  },
  fecha: { color: colores.textoSuave, marginTop: 4 },
  venta: { color: colores.textoSuave },
});