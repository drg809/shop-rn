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
    Portal,
    Dialog,
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
import { useAccionUnica } from '../hooks/useAccionUnica';

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
    const [error, setError] = useState<string | null>(null);
    const [exito, setExito] = useState<string | null>(null);
    const [inicial, setInicial] = useState<{
        nombre: string;
        precio: string;
        stockMinimo: string;
        activo: boolean;
        ajusteStock: string;
    } | null>(null);
    const [dialogoCancelar, setDialogoCancelar] = useState(false);
    const { enCurso: guardando, ejecutar: ejecutarGuardar } = useAccionUnica();



    const esEdicion = Boolean(productoId);
    const precioNum = Number(precio);
    const precioValido = precio.trim() !== '' && !isNaN(precioNum) && precioNum >= 0;
    const precioError =
        precio.trim() === ''
            ? 'El precio es obligatorio'
            : isNaN(precioNum)
                ? 'El precio debe ser un número'
                : precioNum < 0
                    ? 'El precio no puede ser negativo'
                    : '';

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
                    setInicial({
                        nombre: p.nombre,
                        precio: String(p.precio),
                        stockMinimo: String(p.stock_minimo),
                        activo: p.activo,
                        ajusteStock: '',
                    });
                }
            })();
        } else {
            const nuevoId = 'P-' + Math.random().toString(36).slice(2, 8).toUpperCase();
            setId(nuevoId);
            setInicial({
                nombre: '',
                precio: '',
                stockMinimo: '0',
                activo: true,
                ajusteStock: '',
            });
        }
    }, [productoId]);

    async function guardar() {
        ejecutarGuardar(async () => {
            setError(null);
            setExito(null);
            if (!nombre.trim()) {
                setError('El nombre es obligatorio');
                return;
            }
            if (!precioValido) {
                setError('Precio inválido');
                return;
            }

            const precioNum = Number(precio);
            const stockMinNum = Number(stockMinimo) || 0;

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
            }
        });
    }

    const hayCambios =
        inicial !== null &&
        (nombre !== inicial.nombre ||
            precio !== inicial.precio ||
            stockMinimo !== inicial.stockMinimo ||
            activo !== inicial.activo ||
            ajusteStock !== inicial.ajusteStock);

    function intentarCancelar() {
        if (hayCambios) {
            setDialogoCancelar(true);
        } else {
            onCerrar(false);
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
                    error={!!precioError && precio !== ''}
                />
                <HelperText type="error" visible={!!precioError && precio !== ''}>
                    {precioError}
                </HelperText>

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
                    disabled={guardando || !precioValido || !nombre.trim()}
                    style={styles.botonGuardar}
                >
                    {guardando ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                    mode="outlined"
                    onPress={intentarCancelar}
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

            <Portal>
                <Dialog visible={dialogoCancelar} onDismiss={() => setDialogoCancelar(false)}>
                    <Dialog.Title>Descartar cambios</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">
                            Hay cambios sin guardar. ¿Seguro que quieres salir sin guardarlos?
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDialogoCancelar(false)}>Seguir editando</Button>
                        <Button
                            onPress={() => {
                                setDialogoCancelar(false);
                                onCerrar(false);
                            }}
                            textColor={colores.stockBajo}
                        >
                            Descartar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
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