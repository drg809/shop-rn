import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Button,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { sincronizarBajada } from '../services/syncService';
import { listarProductosConStockMostrado, ProductoConStockMostrado } from '../repositories/productosRepo';

type Props = {
    refreshKey?: number;
    onNuevoProducto: () => void;
    onEditarProducto: (id: string) => void;
};

export default function ProductosScreen({ refreshKey = 0, onNuevoProducto, onEditarProducto }: Props) {
    const [productos, setProductos] = useState<ProductoConStockMostrado[]>([]);
    const [cargando, setCargando] = useState(true);

    async function recargarLista() {
        const lista = await listarProductosConStockMostrado();
        setProductos(lista);
    }

    async function sincronizarYRefrescar() {
        setCargando(true);
        try {
            await sincronizarBajada();
            await recargarLista()
        } catch (e: any) {
            Alert.alert('Error de sincronización', e.message);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        sincronizarYRefrescar();
    }, []);

    useEffect(() => {
        if (refreshKey > 0) {
            recargarLista();
        }
    }, [refreshKey]);

    if (cargando) {
        return <ActivityIndicator style={styles.centrado} size="large" />;
    }

    return (
        <View style={styles.container}>
            <Button title="Sincronizar" onPress={sincronizarYRefrescar} />
            <Button title="Nuevo producto" onPress={onNuevoProducto} />
            <FlatList
                data={productos}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => onEditarProducto(item.id)}
                    >
                        <Text style={styles.nombre}>{item.nombre}</Text>
                        <Text>
                            Stock: {item.stock_mostrado} | Mín: {item.stock_minimo} | {item.precio} CUP
                        </Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <Text style={styles.vacio}>No hay productos. Añade alguno en la hoja.</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    centrado: { flex: 1 },
    item: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    nombre: { fontWeight: 'bold', fontSize: 16 },
    vacio: { padding: 16 },
});