import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
    Card,
    Text,
    Button,
    ActivityIndicator,
    Snackbar,
    Searchbar
} from 'react-native-paper';
import { sincronizarBajada } from '../services/syncService';
import {
    listarProductosConStockMostrado,
    ProductoConStockMostrado,
} from '../repositories/productosRepo';
import { commonStyles } from '../styles/commonStyles';
import { useAccionUnica } from '../hooks/useAccionUnica';

type Props = {
    refreshKey?: number;
    onNuevoProducto: () => void;
    onEditarProducto: (id: string) => void;
};


export default function ProductosScreen({
    refreshKey = 0,
    onNuevoProducto,
    onEditarProducto,
}: Props) {
    const [productos, setProductos] = useState<ProductoConStockMostrado[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const { enCurso: cargando, ejecutar: ejecutarSincronizar } = useAccionUnica();

    const productosFiltrados = useMemo(() => {
        if (!busqueda.trim()) return productos;
        const q = busqueda.toLowerCase().trim();
        return productos.filter(
            (p) => p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
        );
    }, [productos, busqueda]);

    async function recargarLista() {
        const lista = await listarProductosConStockMostrado();
        setProductos(lista);
    }

    async function sincronizarYRefrescar() {
        ejecutarSincronizar(async () => {
            setError(null);
            try {
                await sincronizarBajada();
                await recargarLista();
            } catch (e: any) {
                setError(e.message ?? 'Error de sincronización');
            }
        });
    }

    useEffect(() => {
        sincronizarYRefrescar();
    }, []);

    useEffect(() => {
        if (refreshKey > 0) {
            recargarLista();
        }
    }, [refreshKey]);

    if (cargando && productos.length === 0) {
        return (
            <View style={commonStyles.centrado}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={commonStyles.container}>
            <View style={commonStyles.acciones}>
                <Button
                    mode="contained"
                    icon="sync"
                    onPress={sincronizarYRefrescar}
                    loading={cargando}
                    disabled={cargando}
                    style={commonStyles.botonAccion}
                >
                    Sincronizar
                </Button>
                <Button
                    mode="outlined"
                    icon="plus"
                    onPress={onNuevoProducto}
                    style={commonStyles.botonAccion}
                >
                    Nuevo producto
                </Button>
            </View>

            <Searchbar
                placeholder="Buscar por nombre o ID"
                onChangeText={setBusqueda}
                value={busqueda}
                style={styles.buscador}
            />

            <FlatList
                data={productosFiltrados}
                keyExtractor={(item) => item.id}
                contentContainerStyle={commonStyles.lista}
                renderItem={({ item }) => {
                    const stockBajo = item.stock_mostrado <= item.stock_minimo;
                    return (
                        <Card
                            style={commonStyles.card}
                            onPress={() => onEditarProducto(item.id)}
                            mode="elevated"
                        >
                            <Card.Content>
                                <View style={commonStyles.cardHeader}>
                                    <Text variant="titleMedium" style={commonStyles.nombre}>
                                        {item.nombre}
                                    </Text>
                                    <Text
                                        variant="labelLarge"
                                        style={[
                                            commonStyles.stock,
                                            stockBajo ? commonStyles.stockBajo : commonStyles.stockOk,
                                        ]}
                                    >
                                        {item.stock_mostrado} disp.
                                    </Text>
                                </View>
                                <Text variant="bodyMedium" style={commonStyles.detalle}>
                                    Mín: {item.stock_minimo} · {item.precio.toFixed(2)} CUP
                                </Text>
                            </Card.Content>
                        </Card>
                    );
                }}
                ListEmptyComponent={
                    <Text variant="bodyMedium" style={commonStyles.vacio}>
                        {busqueda.trim()
                            ? `No hay productos que coincidan con "${busqueda}"`
                            : 'No hay productos. Añade alguno en la hoja.'}
                    </Text>
                }
            />

            <Snackbar
                visible={!!error}
                onDismiss={() => setError(null)}
                duration={4000}
                action={{ label: 'Cerrar', onPress: () => setError(null) }}
            >
                {error}
            </Snackbar>
        </View>
    );
}

const styles = StyleSheet.create({
    buscador: {
        marginHorizontal: 16,
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
    },
});