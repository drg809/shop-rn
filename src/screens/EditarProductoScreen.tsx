import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
    Text,
    TextInput,
    Button,
    Switch,
    HelperText,
    ActivityIndicator,
    Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    obtenerProducto,
    insertarProductoLocal,
    actualizarProductoLocal,
} from '../repositories/productosRepo';
import { crearProducto, actualizarProducto } from '../api/sheetsApi';
import { registrarAjuste } from '../repositories/ventasRepo';
import { getOrCreateDeviceId, getMeta } from '../db/database';
import { Producto } from '../types';
import { commonStyles, colores } from '../styles/commonStyles';

type Props = {
    productoId?: string;
    onCerrar: (huboCambios: boolean) => void;
};

export default function EditarProductoScreen({ productoId, onCerrar }: Props) {
    const [id, setId] = useState(productoId ?? '');
    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState('');
    const [stockMinimo, setStockMinimo] = useState('0');
    const [activo, setActivo] = useState(true);
    const [ajusteStock, setAjusteStock] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exito, setExito] = useState<string | null>(null);
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
            setId('P-' + Math.random().toString(36).slice(2, 8).toUpperCase());
        }
    }, [productoId]);

    async function guardar() {
        setError(null);
        setExito(null);
        if (!nombre.trim()) {
            setError('El nombre es obligatorio');
            return;
        }
        const precioNum = Number(precio);
        if (isNaN(precioNum) || precioNum < 0) {
            setError('Precio inválido');
            return;
        }
        const stockMinNum = Number(stockMinimo) || 0;

        setGuardando(true);
        try {
            if (!esEdicion) {
                const prod: Producto = {
                    id,
                    nombre: nombre.trim(),
                    precio: precioNum,
                    stock_actual: 0,
                    stock_minimo: stockMinNum,
                    activo,
                };
                await crearProducto(prod);
                await insertarProductoLocal({
                    id,
                    nombre: nombre.trim(),
                    precio: precioNum,
                    stock_actual: 0,
                    stock_minimo: stockMinNum,
                    activo,
                });
                setExito(`Producto creado (ID: ${id})`);
                setTimeout(() => onCerrar(true), 800);
            } else {
                if (nombre.trim()) await actualizarProducto(id, 'nombre', nombre.trim());
                await actualizarProducto(id, 'precio', precioNum);
                await actualizarProducto(id, 'stock_minimo', stockMinNum);
                await actualizarProducto(id, 'activo', activo);

                await actualizarProductoLocal(id, {
                    nombre: nombre.trim(),
                    precio: precioNum,
                    stock_minimo: stockMinNum,
                    activo,
                });

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

                setExito('Producto actualizado');
                setTimeout(() => onCerrar(true), 800);
            }
        } catch (e: any) {
            setError(e.message ?? 'Error al guardar');
        } finally {
            setGuardando(false);
        }
    }

    return (
        <SafeAreaView style={[commonStyles.container, styles.fondo]} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={styles.contenido}>
                <Text variant="titleLarge" style={styles.titulo}>
                    {esEdicion ? 'Editar producto' : 'Nuevo producto'}
                </Text>

                <TextInput
                    label="ID"
                    value={id}
                    editable={false}
                    mode="outlined"
                    style={styles.input}
                />

                <TextInput
                    label="Nombre"
                    value={nombre}
                    onChangeText={setNombre}
                    mode="outlined"
                    style={styles.input}
                />

                <TextInput
                    label="Precio (CUP)"
                    value={precio}
                    onChangeText={setPrecio}
                    keyboardType="decimal-pad"
                    mode="outlined"
                    style={styles.input}
                />

                <TextInput
                    label="Stock mínimo"
                    value={stockMinimo}
                    onChangeText={setStockMinimo}
                    keyboardType="number-pad"
                    mode="outlined"
                    style={styles.input}
                />

                <View style={styles.switchRow}>
                    <Text variant="bodyLarge">Activo</Text>
                    <Switch value={activo} onValueChange={setActivo} />
                </View>

                {esEdicion && (
                    <>
                        <TextInput
                            label="Ajuste de stock (opcional)"
                            value={ajusteStock}
                            onChangeText={setAjusteStock}
                            keyboardType="numbers-and-punctuation"
                            placeholder="Ej: 10 (entrada) o -2 (merma)"
                            mode="outlined"
                            style={styles.input}
                        />
                        <HelperText type="info" visible>
                            Positivo suma stock, negativo resta. Se registrará como movimiento de ajuste.
                        </HelperText>
                    </>
                )}

                <Button
                    mode="contained"
                    icon="content-save"
                    onPress={guardar}
                    loading={guardando}
                    disabled={guardando}
                    style={styles.botonGuardar}
                >
                    {guardando ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                    mode="outlined"
                    onPress={() => onCerrar(false)}
                    disabled={guardando}
                >
                    Cancelar
                </Button>

                {guardando && (
                    <View style={styles.overlay}>
                        <ActivityIndicator size="large" />
                    </View>
                )}
            </ScrollView>

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
                duration={2000}
                style={{ backgroundColor: colores.stockOk }}
            >
                {exito}
            </Snackbar>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    fondo: { backgroundColor: '#F8FAFC' },
    contenido: { padding: 16, paddingBottom: 32 },
    titulo: { marginBottom: 12 },
    input: { marginBottom: 8, backgroundColor: '#FFFFFF' },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    botonGuardar: { marginTop: 8, marginBottom: 8 },
    overlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(255,255,255,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});