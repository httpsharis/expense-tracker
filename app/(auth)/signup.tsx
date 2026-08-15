import { supabase } from '@shared/lib/supabase';
import { tokens } from '@shared/theme/tokens';
import { Href, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SignupScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!email || !password) return;
        setLoading(true);
        const { error } = await supabase.auth.signUp({ email, password });
        setLoading(false);

        if (error) {
            Alert.alert('Sign Up Error', error.message);
        } else {
            Alert.alert('Success', 'Account created! Please sign in.', [
                { text: 'OK', onPress: () => router.replace('/(auth)/login' as Href) },
            ]);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>EXPENSE TRACKER</Text>
                <Text style={styles.subtitle}>Create your account</Text>

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

                <Pressable style={styles.btn} onPress={handleSignup} disabled={loading}>
                    <Text style={styles.btnText}>{loading ? 'Creating...' : 'Sign Up'}</Text>
                </Pressable>

                <Pressable style={styles.linkBtn} onPress={() => router.push('/(auth)/login' as Href)}>
                    <Text style={styles.linkText}>Already have an account? Sign in</Text>
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
