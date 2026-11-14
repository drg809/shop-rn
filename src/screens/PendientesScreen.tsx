import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listarPendientes, contarPendientes } from '../repositories/movimientosPendientesRepo';
import { sincronizarCompleta } from '../services/syncService';
import { Movimiento } from '../types';

type Props = {
  onVolver: () => void;
  onSyncTerminada?: (subidos: number) => void;
};

export default function PendientesScreen({ onVolver, onSyncTerminada }: Props) {
  const [pendientes, setPendientes] = useState<Movimiento[]>([]);
  const [sincronizando, setSincronizando] = useState(false);

  async function cargar() {
    setPendientes(await listarPendientes());
  }

  useEffect(() => {
    cargar();
  }, []);

  async function sincronizar() {
    setSincronizando(true);
    try {
      const resumen = await sincronizarCompleta();
      Alert.alert(
        'Sincronización completada',
        `Movimientos subidos: ${resumen.subidos}\nProductos: ${resumen.productos}\nUsuarios: ${resumen.usuarios}`
      );
      await cargar();
      onSyncTerminada?.(resumen.subidos);
    } catch (e: any) {
      Alert.alert('Error al sincronizar', e.message);
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.titulo}>Pendientes ({pendientes.length})</Text>

      <FlatList
        data={pendientes}
        keyExtractor={p => p.id_mov}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.tipo}>
              {item.tipo.toUpperCase()} · {item.cantidad} · {item.producto_id}
            </Text>
            <Text style={styles.fecha}>{item.fecha}</Text>
            <Text style={styles.venta}>Venta: {item.id_venta || '—'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.vacio}>No hay movimientos pendientes.</Text>}
      />

      <View style={styles.botones}>
        <Button
          title={sincronizando ? 'Sincronizando...' : 'Sincronizar todo'}
          onPress={sincronizar}
          disabled={sincronizando || pendientes.length === 0}
        />
        <Button title="Volver" onPress={onVolver} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  item: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tipo: { fontWeight: 'bold' },
  fecha: { fontSize: 12, color: '#666' },
  venta: { fontSize: 12, color: '#666' },
  vacio: { padding: 16, textAlign: 'center', color: '#888' },
  botones: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ccc' },
});