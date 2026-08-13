// app/_layout.tsx
import { ThemeProvider } from '@/theme/ThemeProvider';
import { IBMPlexSans_600SemiBold, useFonts } from '@expo-google-fonts/ibm-plex-sans';
import { Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'IBMPlexSans-SemiBold': IBMPlexSans_600SemiBold,
    'Roboto-Regular': Roboto_400Regular,
    'Roboto-Bold': Roboto_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}