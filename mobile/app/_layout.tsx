import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#0F172A" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0F172A' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="orders" />
          <Stack.Screen name="journey" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
