import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, Button, Alert, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    obtenerProducto, insertarProductoLocal, actualizarProductoLocal,
} from '../repositories/productosRepo';
import { crearProducto, actualizarProducto } from '../api/sheetsApi';
import { registrarAjuste } from '../repositories/ventasRepo';
import { getOrCreateDeviceId, getMeta } from '../db/database';

type Props = {
    productoId?: string;    // si viene, es edición
    onCerrar: (huboCambios: boolean) => void;
};

export default function EditarProductoScreen({ productoId, onCerrar }: Props) {
    const [id, setId] = useState(productoId ?? '');
    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState('');
    const [stockMinimo, setStockMinimo] = useState('0');
    const [activo, setActivo] = useState(true);
    const [ajusteStock, setAjusteStock] = useState(''); // solo en edición
    const [guardando, setGuardando] = useState(false);
    const esEdicion = Boolean(productoId);

    useEffect(() => {
        if (productoId) {
            (async () => {
                const p = await obtenerProducto(productoId);
                if (p) {
                    setId(p.id);
                    setNombre(p.nombre);
                    setPrecio(String(p.precio));
                    setStockMinimo(String(p.stock_minimo));
                    setActivo(p.activo);
                }
            })();
        } else {
            // id nuevo: SKU o UUID
            setId('P-' + Math.random().toString(36).slice(2, 8).toUpperCase());
        }
    }, [productoId]);

    async function guardar() {
        if (!nombre.trim()) {
            Alert.alert('El nombre es obligatorio');
            return;
        }
        const precioNum = Number(precio);
        if (isNaN(precioNum) || precioNum < 0) {
            Alert.alert('Precio inválido');
            return;
        }
        const stockMinNum = Number(stockMinimo) || 0;

        setGuardando(true);
        try {
            if (!esEdicion) {
                // 1. Crear en la hoja
                await crearProducto([id, nombre.trim(), precioNum, '', stockMinNum, activo]);
                // 2. Insertar en local (para que se vea al instante)
                await insertarProductoLocal({
                    id, nombre: nombre.trim(), precio: precioNum,
                    stock_actual: 0, stock_minimo: stockMinNum, activo,
                });
                Alert.alert('Producto creado', `ID: ${id}`);
                onCerrar(true);
            } else {
                // 1. Actualizar campos maestros en la hoja
                if (nombre.trim()) await actualizarProducto(id, 'nombre', nombre.trim());
                await actualizarProducto(id, 'precio', precioNum);
                await actualizarProducto(id, 'stock_minimo', stockMinNum);
                await actualizarProducto(id, 'activo', activo);

                // 2. Actualizar en local
                await actualizarProductoLocal(id, {
                    nombre: nombre.trim(), precio: precioNum,
                    stock_minimo: stockMinNum, activo,
                });

                // 3. Si hay ajuste de stock, registrarlo como movimiento
                const ajusteNum = Number(ajusteStock);
                if (!isNaN(ajusteNum) && ajusteNum !== 0) {
                    const usuario = (await getMeta('usuario_actual')) ?? 'admin';
                    const device_id = await getOrCreateDeviceId();
                    await registrarAjuste({
                        producto_id: id,
                        cantidad: ajusteNum,
                        usuario,
                        device_id,
                    });
                }

                Alert.alert('Producto actualizado');
                onCerrar(true);
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setGuardando(false);
        }
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScrollView>
                <Text style={styles.titulo}>{esEdicion ? 'Editar producto' : 'Nuevo producto'}</Text>

                <Text style={styles.label}>ID</Text>
                <TextInput style={styles.input} value={id} editable={false} />

                <Text style={styles.label}>Nombre</Text>
                <TextInput style={styles.input} value={nombre} onChangeText={setNombre} />

                <Text style={styles.label}>Precio (CUP)</Text>
                <TextInput
                    style={styles.input}
                    value={precio}
                    onChangeText={setPrecio}
                    keyboardType="decimal-pad"
                />

                <Text style={styles.label}>Stock mínimo</Text>
                <TextInput
                    style={styles.input}
                    value={stockMinimo}
                    onChangeText={setStockMinimo}
                    keyboardType="number-pad"
                />

                <View style={styles.switchRow}>
                    <Text style={styles.label}>Activo</Text>
                    <Switch value={activo} onValueChange={setActivo} />
                </View>

                {esEdicion && (
                    <>
                        <Text style={styles.label}>Ajuste de stock (opcional)</Text>
                        <TextInput
                            style={styles.input}
                            value={ajusteStock}
                            onChangeText={setAjusteStock}
                            keyboardType="numbers-and-punctuation"
                            placeholder="Ej: 10 (entrada) o -2 (merma)"
                        />
                        <Text style={styles.ayuda}>
                            Positivo suma stock, negativo resta. Se registrará como movimiento de ajuste.
                        </Text>
                    </>
                )}

                <View style={styles.botones}>
                    <Button title={guardando ? 'Guardando...' : 'Guardar'} onPress={guardar} disabled={guardando} />
                    <Button title="Cancelar" onPress={() => onCerrar(false)} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#fff' },
    titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
    label: { marginTop: 8, fontWeight: '600' },
    input: {
        borderWidth: 1, borderColor: '#ccc', borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 6, marginTop: 4,
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
    ayuda: { fontSize: 12, color: '#666', marginTop: 4 },
    botones: { marginTop: 16, gap: 8 },
});