import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

// IMPORTANTE: Importamos el Provider que creamos
import { BaseballProvider } from '../context/BaseballContext';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    // 1. Envolvemos TODO con el BaseballProvider para que los datos fluyan entre pantallas
    <BaseballProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack>
          {/* Pantalla principal con las pestañas */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          
          {/* Modal de Configuración Inicial */}
          <Stack.Screen 
            name="modal" 
            options={{ 
              presentation: 'modal', 
              title: 'Configurar Juego',
              headerStyle: { backgroundColor: '#111827' },
              headerTintColor: '#fff'
            }} 
          />

          {/* Modal de Relevo */}
          <Stack.Screen 
            name="relevo" 
            options={{ 
              presentation: 'transparentModal', 
              animation: 'fade',
              headerShown: false 
            }} 
          />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </BaseballProvider>
  );
}
