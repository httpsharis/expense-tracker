import { IBMPlexSans_500Medium, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans';
import { Roboto_400Regular, Roboto_700Bold, useFonts } from '@expo-google-fonts/roboto';
import { useCurrencyStore } from '@shared/store/currencyStore';
import { tokens } from '@shared/theme/tokens';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 1000 * 60 * 5,
        },
    },
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded, error] = useFonts({
        'IBMPlexSans-Medium': IBMPlexSans_500Medium,
        'IBMPlexSans-SemiBold': IBMPlexSans_600SemiBold,
        'Roboto-Regular': Roboto_400Regular,
        'Roboto-Bold': Roboto_700Bold,
    });

    const loadRates = useCurrencyStore((state) => state.loadRates);

    useEffect(() => {
        loadRates();
    }, [loadRates]);

    useEffect(() => {
        if (loaded || error) {
            SplashScreen.hideAsync();
        }
    }, [loaded, error]);

    if (!loaded && !error) {
        return null;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <StatusBar barStyle="light-content" backgroundColor={tokens.colors.dark.background} />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: tokens.colors.dark.background },
                    headerTintColor: tokens.colors.dark.onSurface,
                    headerTitleStyle: { ...tokens.typography.headlineMd },
                    contentStyle: { backgroundColor: tokens.colors.dark.background },
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)/login" options={{ title: 'Sign In', headerShown: false }} />
                <Stack.Screen name="(auth)/signup" options={{ title: 'Create Account', headerShown: false }} />
                <Stack.Screen name="transaction/[id]" options={{ title: 'Transaction Details' }} />
                <Stack.Screen name="person/[id]" options={{ title: 'Person Ledger' }} />
            </Stack>
        </QueryClientProvider>
    );
}
