import { MD3LightTheme, MD3Theme } from 'react-native-paper';

export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563EB',        // Azul para acciones principales
    onPrimary: '#FFFFFF',      // Texto sobre el color principal
    primaryContainer: '#DBEAFE', // Fondo de contenedores primarios (opcional)
    secondary: '#0F766E',      // Verde azulado para acentos
    background: '#F8FAFC',     // Fondo gris muy claro (no blanco puro)
    surface: '#FFFFFF',        // Fondo de tarjetas y superficies
    onSurface: '#0F172A',      // Texto principal
    onSurfaceVariant: '#64748B', // Texto secundario
    error: '#DC2626',          // Rojo para errores
  },
  roundness: 8, // Bordes redondeados más modernos
};