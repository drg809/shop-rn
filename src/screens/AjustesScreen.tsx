import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
    Text,
    Button,
    Card,
    Switch,
    List,
    Divider,
    ActivityIndicator,
    Snackbar,
    Dialog,
    Portal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import {
    getMeta,
    setMeta,
    getOrCreateDeviceId,
} from '../db/database';
import { listarUsuarios } from '../repositories/usuariosRepo';
import { reemplazarProductos } from '../repositories/productosRepo';
import { reemplazarUsuarios } from '../repositories/usuariosRepo';
import { sincronizarBajada } from '../services/syncService';
import { Usuario } from '../types';
import { commonStyles, colores } from '../styles/commonStyles';
import { useAccionUnica } from '../hooks/useAccionUnica';

type Props = {
    onVolver: () => void;
};

export default function AjustesScreen({ onVolver }: Props) {
    const [usuario, setUsuario] = useState<string>('admin');
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [deviceId, setDeviceId] = useState<string>('');
    const [permitirSinStock, setPermitirSinStock] = useState(false);
    const [ultimaSync, setUltimaSync] = useState<string | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exito, setExito] = useState<string | null>(null);
    const [dialogoUsuario, setDialogoUsuario] = useState(false);
    const [dialogoRecarga, setDialogoRecarga] = useState(false);
    const { enCurso: recargando, ejecutar: ejecutarRecarga } = useAccionUnica();

    async function cargar() {
        setCargando(true);
        try {
            const u = (await getMeta('usuario_actual')) ?? 'admin';
            setUsuario(u);
            const dev = await getOrCreateDeviceId();
            setDeviceId(dev);
            const ps = (await getMeta('permitir_venta_sin_stock')) === 'true';
            setPermitirSinStock(ps);
            const ult = await getMeta('ultima_sincronizacion');
            setUltimaSync(ult);

            const lista = await listarUsuarios();
            setUsuarios(lista.filter((x) => x.activo));
        } catch (e: any) {
            setError(e.message ?? 'Error al cargar ajustes');
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargar();
    }, []);

    async function cambiarUsuario(nuevo: string) {
        const u = usuarios.find(x => x.usuario === nuevo);
        if (u) {
            setUsuario(nuevo);
            await setMeta('usuario_actual', nuevo);
            setDialogoUsuario(false);
            setExito(`Usuario cambiado a "${nuevo}"`);
        } else {
            setError('No se encontró el usuario seleccionado.');
        }
    }

    async function cambiarPermitirSinStock(valor: boolean) {
        setPermitirSinStock(valor);
        await setMeta('permitir_venta_sin_stock', valor ? 'true' : 'false');
    }

    function forzarRecarga() {
        setDialogoRecarga(false);
        ejecutarRecarga(async () => {
            setError(null);
            try {
                await reemplazarProductos([]);
                await reemplazarUsuarios([]);
                await sincronizarBajada();
                await cargar();
                setExito('Caché local recargada desde la hoja');
            } catch (e: any) {
                setError(e.message ?? 'Error al recargar');
            }
        });
    }

    if (cargando) {
        return (
            <View style={commonStyles.centrado}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <SafeAreaView
            style={[commonStyles.container, commonStyles.bkgApp]}
            edges={['top', 'bottom']}
        >
            <ScrollView contentContainerStyle={styles.contenido}>
                <Text variant="titleLarge" style={styles.titulo}>
                    Ajustes
                </Text>

                {/* Usuario */}
                <Card style={commonStyles.card} mode="elevated">
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.seccion}>
                            Usuario
                        </Text>
                        <List.Item
                            title={usuario}
                            description="Usuario actual para las ventas"
                            left={(props) => <List.Icon {...props} icon="account" />}
                            right={(props) => <List.Icon {...props} icon="chevron-right" />}
                            onPress={() => setDialogoUsuario(true)}
                        />
                    </Card.Content>
                </Card>

                {/* Ventas */}
                <Card style={commonStyles.card} mode="elevated">
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.seccion}>
                            Ventas
                        </Text>
                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text variant="bodyLarge">Permitir venta sin stock</Text>
                                <Text variant="bodySmall" style={styles.ayuda}>
                                    Si está activo, se puede vender aunque no haya stock local.
                                </Text>
                            </View>
                            <Switch
                                value={permitirSinStock}
                                onValueChange={cambiarPermitirSinStock}
                            />
                        </View>
                    </Card.Content>
                </Card>

                {/* Sincronización */}
                <Card style={commonStyles.card} mode="elevated">
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.seccion}>
                            Sincronización
                        </Text>
                        <List.Item
                            title="Última sincronización"
                            description={
                                ultimaSync ? new Date(ultimaSync).toLocaleString() : 'Nunca'
                            }
                            left={(props) => <List.Icon {...props} icon="clock-outline" />}
                        />
                        <Divider style={{ marginVertical: 8 }} />
                        <Button
                            mode="outlined"
                            icon="refresh"
                            onPress={() => setDialogoRecarga(true)}
                            loading={recargando}
                            disabled={recargando}
                        >
                            Forzar recarga completa
                        </Button>
                        <Text variant="bodySmall" style={[styles.ayuda, { marginTop: 8 }]}>
                            Borra la caché local y vuelve a descargar productos y usuarios de la hoja.
                        </Text>
                    </Card.Content>
                </Card>

                {/* Dispositivo */}
                <Card style={commonStyles.card} mode="elevated">
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.seccion}>
                            Dispositivo
                        </Text>
                        <List.Item
                            title="ID del dispositivo"
                            description={deviceId}
                            left={(props) => <List.Icon {...props} icon="cellphone" />}
                        />
                        <List.Item
                            title="Versión de la app"
                            description={Constants.expoConfig?.version ?? 'desconocida'}
                            left={(props) => <List.Icon {...props} icon="information" />}
                        />
                    </Card.Content>
                </Card>

                <Button mode="outlined" onPress={onVolver} style={{ marginTop: 8 }}>
                    Volver
                </Button>
            </ScrollView>

            {/* Diálogo selección de usuario */}
            <Portal>
                <Dialog
                    visible={dialogoUsuario}
                    onDismiss={() => setDialogoUsuario(false)}
                >
                    <Dialog.Title>Seleccionar usuario</Dialog.Title>
                    <Dialog.Content>
                        {usuarios.length === 0 ? (
                            <Text variant="bodyMedium">
                                No hay usuarios activos en la hoja.
                            </Text>
                        ) : (
                            usuarios.map((u) => (
                                <List.Item
                                    key={u.usuario}
                                    title={u.usuario}
                                    left={(props) => (
                                        <List.Icon
                                            {...props}
                                            icon={
                                                u.usuario === usuario
                                                    ? 'radiobox-marked'
                                                    : 'radiobox-blank'
                                            }
                                        />
                                    )}
                                    onPress={() => cambiarUsuario(u.usuario)}
                                />
                            ))
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDialogoUsuario(false)}>Cancelar</Button>
                    </Dialog.Actions>
                </Dialog>

                {/* Diálogo recarga */}
                <Dialog
                    visible={dialogoRecarga}
                    onDismiss={() => setDialogoRecarga(false)}
                >
                    <Dialog.Title>Forzar recarga</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">
                            Se borrará la caché local de productos y usuarios, y se volverá a
                            descargar de la hoja. ¿Continuar?
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDialogoRecarga(false)}>Cancelar</Button>
                        <Button onPress={forzarRecarga} textColor={colores.stockBajo}>
                            Recargar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Snackbars */}
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
                duration={3000}
                style={{ backgroundColor: colores.stockOk }}
                action={{ label: 'OK', onPress: () => setExito(null) }}
            >
                {exito}
            </Snackbar>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    contenido: { padding: 16, paddingBottom: 32 },
    titulo: { marginBottom: 12 },
    seccion: { marginBottom: 4 },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    ayuda: { color: colores.textoSuave, marginTop: 2 },
});