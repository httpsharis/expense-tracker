import { supabase } from '@shared/lib/supabase';
import { tokens } from '@shared/theme/tokens';
import { Href, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) return;
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);

        if (error) {
            Alert.alert('Login Error', error.message);
        } else {
            router.replace('/(tabs)' as Href);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>EXPENSE TRACKER</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={tokens.colors.dark.outline}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={tokens.colors.dark.outline}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <Pressable style={styles.btn} onPress={handleLogin} disabled={loading}>
                    <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
                </Pressable>

                <Pressable style={styles.linkBtn} onPress={() => router.push('/(auth)/signup' as Href)}>
                    <Text style={styles.linkText}>Don't have an account? Sign up</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens.colors.dark.background,
        justifyContent: 'center',
        padding: tokens.spacing.containerPadding,
    },
    card: {
        backgroundColor: tokens.colors.dark.surfaceContainer,
        borderRadius: tokens.radius.hero,
        padding: tokens.spacing.containerPadding,
        gap: 16,
    },
    title: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurfaceVariant,
    },
    subtitle: {
        ...tokens.typography.headlineLg,
        color: tokens.colors.dark.onSurface,
        fontSize: 24,
    },
    input: {
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        color: tokens.colors.dark.onSurface,
        padding: 14,
        borderRadius: tokens.radius.md,
    },
    btn: {
        backgroundColor: tokens.colors.dark.primary,
        paddingVertical: 14,
        borderRadius: tokens.radius.default,
        alignItems: 'center',
        marginTop: 8,
    },
    btnText: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onPrimary,
        fontWeight: '600',
    },
    linkBtn: {
        alignItems: 'center',
        marginTop: 8,
    },
    linkText: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurfaceVariant,
    },
});
