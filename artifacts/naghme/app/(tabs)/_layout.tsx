import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

// IMPORTANT: iOS 26 uses NativeTabs for native tabs with liquid glass support.
// NativeTabs intentionally does NOT use custom design tokens — liquid glass
// is a system-level appearance provided by iOS and cannot be overridden.
// Custom brand colors are applied only on the ClassicTabLayout path (older iOS / Android / web).
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>خانه</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="archive">
        <Icon sf={{ default: 'music.note.list', selected: 'music.note.list' }} />
        <Label>آرشیو</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <Icon sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }} />
        <Label>جست‌وجو</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="graph">
        <Icon sf={{ default: 'point.3.connected.trianglepath.dotted', selected: 'point.3.connected.trianglepath.dotted' }} />
        <Label>نقشه</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ai-chat">
        <Icon sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }} />
        <Label>گفتگو</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
          headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'خانه',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: 'آرشیو',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="music.note.list" tintColor={color} size={24} />
            ) : (
              <Feather name="music" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'جست‌وجو',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="magnifyingglass" tintColor={color} size={24} />
            ) : (
              <Feather name="search" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="graph"
        options={{
          title: 'نقشه',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="point.3.connected.trianglepath.dotted" tintColor={color} size={24} />
            ) : (
              <Feather name="git-branch" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: 'گفتگو',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bubble.left.and.bubble.right" tintColor={color} size={24} />
            ) : (
              <Feather name="message-circle" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
