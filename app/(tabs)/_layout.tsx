import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@shared/theme/tokens';
import { GlassView } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: tokens.colors.dark.background },
                headerTintColor: tokens.colors.dark.onSurface,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: tokens.colors.dark.primary,
                tabBarInactiveTintColor: tokens.colors.dark.onSurfaceVariant,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarBackground: () => (
                    <GlassView
                        glassEffectStyle="regular"
                        colorScheme="dark"
                        style={[StyleSheet.absoluteFill, { borderRadius: tokens.radius.hero, overflow: 'hidden' }]}
                    />
                ),
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    headerTitle: tokens.appName,
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="transactions"
                options={{
                    title: 'Transactions',
                    headerTitle: 'Transactions',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="people"
                options={{
                    title: 'People',
                    headerTitle: 'People & Debts',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    headerTitle: 'App Settings',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        elevation: 12,
        backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(22, 27, 34, 0.85)',
        borderRadius: tokens.radius.hero,
        height: 64,
        paddingBottom: 8,
        paddingTop: 8,
        borderTopWidth: 0,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
    },
    tabBarLabel: {
        ...tokens.typography.labelSm,
        marginTop: 2,
    },
});
