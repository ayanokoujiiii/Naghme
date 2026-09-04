import React, { useEffect } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Lalezar_400Regular } from '@expo-google-fonts/lalezar';
import { Vazirmatn_400Regular } from '@expo-google-fonts/vazirmatn';
import { Amiri_400Regular } from '@expo-google-fonts/amiri';
import { Cairo_400Regular } from '@expo-google-fonts/cairo';
import { Rakkas_400Regular } from '@expo-google-fonts/rakkas';
import { ElMessiri_400Regular } from '@expo-google-fonts/el-messiri';
import { Tajawal_400Regular } from '@expo-google-fonts/tajawal';
import { Lateef_400Regular } from '@expo-google-fonts/lateef';
import { ArefRuqaa_400Regular } from '@expo-google-fonts/aref-ruqaa';
import { NotoSansArabic_400Regular } from '@expo-google-fonts/noto-sans-arabic';
import { useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { initializeDatabase } from '@/src/db/database';
import { configureBackgroundAudio } from '@/src/audio/audioManager';
import { migrateCachedAudioUris } from '@/src/db/queries';
import colors from '@/constants/colors';
import { MiniPlayer } from '@/components/MiniPlayer';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerBackTitle: 'بازگشت',
          headerTintColor: colors.light.foreground,
          headerStyle: { backgroundColor: colors.light.background },
          contentStyle: { backgroundColor: colors.light.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-artist" options={{ headerShown: false }} />
        <Stack.Screen name="add-album" options={{ headerShown: false }} />
        <Stack.Screen name="add-track" options={{ headerShown: false }} />
        <Stack.Screen name="add-work" options={{ headerShown: false }} />
        <Stack.Screen name="add-version" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="recommendation" options={{ headerShown: false }} />
        <Stack.Screen name="journal" options={{ headerShown: false }} />
        <Stack.Screen name="history" options={{ headerShown: false }} />
        <Stack.Screen name="track/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="album/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="artist/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="work/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="player"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
      <MiniPlayer />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Lalezar_400Regular,
    Vazirmatn_400Regular,
    Amiri_400Regular,
    Cairo_400Regular,
    Rakkas_400Regular,
    ElMessiri_400Regular,
    Tajawal_400Regular,
    Lateef_400Regular,
    ArefRuqaa_400Regular,
    NotoSansArabic_400Regular,
  });

  useEffect(() => {
    if (Platform.OS !== 'web') {
      initializeDatabase()
        .then(() => migrateCachedAudioUris())
        .catch((error: unknown) => {
          if (__DEV__) {
            console.warn('Naghme database initialization or audio migration failed', error);
          }
        });
    }
    configureBackgroundAudio().catch((error: unknown) => {
      if (__DEV__) {
        console.warn('Naghme background audio setup failed', error);
      }
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Web can render with the platform sans-serif fallback even if remote font
  // loading is unavailable inside the preview iframe. Native keeps the
  // splash-screen gate until fonts are ready.
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <StatusBar style="light" backgroundColor={colors.light.background} />
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
