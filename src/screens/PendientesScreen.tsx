import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Snackbar,
  List
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  listarPendientes,
} from '../repositories/movimientosPendientesRepo';
import { sincronizarCompleta } from '../services/syncService';
import { Movimiento } from '../types';
import { commonStyles, colores } from '../styles/commonStyles';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAccionUnica } from '../hooks/useAccionUnica';

type Props = {
  onVolver: () => void;
  onSyncTerminada?: (subidos: number) => void;
};

type GrupoVenta = {
  id_venta: string;
  fecha: string;
  usuario: string;
  movimientos: Movimiento[];
  total: number; // suma de cantidad * precio_unitario (si lo tienes)
};

export default function PendientesScreen({ onVolver, onSyncTerminada }: Props) {
  const [pendientes, setPendientes] = useState<Movimiento[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const { isOnline } = useNetworkStatus();
  const { enCurso: sincronizando, ejecutar: ejecutarSincronizar } = useAccionUnica();

  const grupos: GrupoVenta[] = useMemo(() => {
    const mapa = new Map<string, GrupoVenta>();

    for (const m of pendientes) {
      const key = m.id_venta || m.id_mov;
      if (!mapa.has(key)) {
        mapa.set(key, {
          id_venta: key,
          fecha: m.fecha,
          usuario: m.usuario,
          movimientos: [],
          total: 0,
        });
      }
      const grupo = mapa.get(key)!;
      grupo.movimientos.push(m);
      grupo.total += m.cantidad;
    }

    return Array.from(mapa.values()).sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }, [pendientes]);

  async function cargar() {
    setPendientes(await listarPendientes());
  }

  useEffect(() => {
    cargar();
  }, []);

  async function sincronizar() {
    ejecutarSincronizar(async () => {
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
      }
    });
  }

  return (
    <SafeAreaView style={[commonStyles.container, styles.fondo]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="titleLarge">
          Pendientes ({grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'}, {pendientes.length} mov.)
        </Text>
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
          data={grupos}
          keyExtractor={(g) => g.id_venta}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <List.Accordion
              title={item.id_venta.startsWith('V-') ? `Venta ${item.id_venta}` : `Ajuste ${item.id_venta}`}
              description={`${item.movimientos.length} línea(s) · ${item.total} uds · ${item.fecha.slice(0, 16).replace('T', ' ')}`}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={item.id_venta.startsWith('V-') ? 'cart' : 'tune'}
                />
              )}
              style={[commonStyles.card, { backgroundColor: '#FFFFFF', borderRadius: 12 }]}
            >
              {item.movimientos.map((m) => (
                <List.Item
                  key={m.id_mov}
                  title={`${m.tipo.toUpperCase()} · ${m.producto_id}`}
                  description={`Cantidad: ${m.cantidad}`}
                  left={(props) => <List.Icon {...props} icon="package-variant" />}
                />
              ))}
            </List.Accordion>
          )}
          ListEmptyComponent={
            <Text variant="bodyMedium" style={commonStyles.vacio}>
              No hay movimientos pendientes.
            </Text>
          }
        />
      )}
      <View style={commonStyles.indicadorRed}>
        <View style={[commonStyles.punto, { backgroundColor: isOnline ? colores.stockOk : colores.stockBajo }]} />
        <Text variant="labelSmall" style={{ color: colores.textoSuave }}>
          {isOnline ? 'En línea' : 'Sin conexión'}
        </Text>
      </View>
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