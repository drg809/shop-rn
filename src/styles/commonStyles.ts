import { StyleSheet } from 'react-native';

// Colores de apoyo (los que no están en el tema de Paper)
export const colores = {
  stockOk: '#16A34A',
  stockBajo: '#DC2626',
  textoSuave: '#64748B',
  bordeSuave: '#E2E8F0',
};

export const commonStyles = StyleSheet.create({
  // Layout básico
  container: { flex: 1 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Barra de acciones (botones superiores)
  acciones: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  botonAccion: { flex: 1 },

  // Listas y tarjetas
  lista: { paddingHorizontal: 16, paddingBottom: 16 },
  card: { marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  // Textos
  nombre: { flex: 1, marginRight: 8 },
  stock: { fontWeight: 'bold' },
  detalle: { color: colores.textoSuave },
  vacio: { textAlign: 'center', padding: 24, color: colores.textoSuave },

  // Barra inferior (la usas en App.tsx)
  barraInferior: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: '#FFFFFF',
  },
});

// Estilos que dependen de un estado (no pueden ir en StyleSheet.create)
export const stockStyle = (bajo: boolean) => [
  commonStyles.stock,
  { color: bajo ? colores.stockBajo : colores.stockOk },
];