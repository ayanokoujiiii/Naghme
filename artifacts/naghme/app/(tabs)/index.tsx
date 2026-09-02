import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 22,
          paddingBottom: insets.bottom + 104,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.eyebrow}>آرشیو شخصی من</Text>
          <Text style={styles.title}>نغمه</Text>
        </View>
        <View style={styles.profileMark}>
          <Feather name="headphones" size={20} color={colors.primary} />
        </View>
      </View>

      <LinearGradient
        colors={['#34261E', '#211B1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroOrbLarge} />
        <View style={styles.heroOrbSmall} />
        <Text style={styles.heroKicker}>صدای خاطره‌ها</Text>
        <Text style={styles.heroTitle}>موسیقی‌هایت را{'\n'}با حس خودت نگه دار</Text>
        <Text style={styles.heroCopy}>
          قطعه‌ها، هنرمندها و یادداشت‌های شنیداری‌ات؛ همه در یک جای آرام و شخصی.
        </Text>
        <Pressable
          testID="home-open-archive"
          onPress={() => router.push('/archive')}
          style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
        >
          <Text style={styles.heroButtonText}>رفتن به آرشیو</Text>
          <Feather name="arrow-left" size={18} color={colors.primaryForeground} />
        </Pressable>
      </LinearGradient>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>شروع کار</Text>
        <Text style={styles.sectionHint}>همین حالا</Text>
      </View>
      <View style={styles.quickGrid}>
        <Pressable
          testID="home-archive-card"
          onPress={() => router.push('/archive')}
          style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
        >
          <View style={[styles.iconTile, { backgroundColor: colors.accent }]}>
            <Feather name="disc" size={22} color={colors.accentForeground} />
          </View>
          <Text style={styles.quickTitle}>آرشیو موسیقی</Text>
          <Text style={styles.quickCopy}>هنوز قطعه‌ای اضافه نشده</Text>
          <Feather name="arrow-left" size={16} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          testID="home-search-card"
          onPress={() => router.push('/search')}
          style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
        >
          <View style={[styles.iconTile, { backgroundColor: colors.secondary }]}>
            <Feather name="search" size={22} color={colors.primary} />
          </View>
          <Text style={styles.quickTitle}>جست‌وجو</Text>
          <Text style={styles.quickCopy}>در میان خاطره‌ها پیدا کن</Text>
          <Feather name="arrow-left" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20 },
    topRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 26,
    },
    eyebrow: {
      color: colors.mutedForeground,
      fontSize: 13,
      fontFamily: 'sans-serif',
      textAlign: 'right',
      marginBottom: 5,
    },
    title: {
      color: colors.foreground,
      fontSize: 34,
      lineHeight: 42,
      fontWeight: '700',
      fontFamily: 'sans-serif',
      textAlign: 'right',
    },
    profileMark: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    hero: {
      minHeight: 300,
      borderRadius: 26,
      padding: 24,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      position: 'relative',
    },
    heroOrbLarge: {
      position: 'absolute',
      width: 210,
      height: 210,
      borderRadius: 105,
      backgroundColor: 'rgba(229, 163, 93, 0.12)',
      top: -82,
      left: -42,
    },
    heroOrbSmall: {
      position: 'absolute',
      width: 90,
      height: 90,
      borderRadius: 45,
      borderWidth: 1,
      borderColor: 'rgba(244, 195, 140, 0.32)',
      top: 30,
      right: 32,
    },
    heroKicker: {
      color: colors.accentForeground,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'right',
      marginBottom: 9,
    },
    heroTitle: {
      color: colors.foreground,
      fontSize: 28,
      lineHeight: 38,
      fontWeight: '700',
      textAlign: 'right',
      marginBottom: 10,
    },
    heroCopy: {
      color: '#C7B8AA',
      fontSize: 14,
      lineHeight: 24,
      textAlign: 'right',
      marginBottom: 20,
    },
    heroButton: {
      alignSelf: 'flex-end',
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 9,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
    },
    heroButtonText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: '700',
    },
    sectionHeader: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 28,
      marginBottom: 14,
    },
    sectionTitle: {
      color: colors.foreground,
      fontSize: 20,
      fontWeight: '700',
    },
    sectionHint: {
      color: colors.mutedForeground,
      fontSize: 12,
    },
    quickGrid: {
      flexDirection: 'row-reverse',
      gap: 12,
    },
    quickCard: {
      flex: 1,
      minHeight: 164,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      justifyContent: 'space-between',
    },
    iconTile: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-end',
    },
    quickTitle: {
      color: colors.cardForeground,
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'right',
      marginTop: 12,
    },
    quickCopy: {
      color: colors.mutedForeground,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'right',
      marginTop: 4,
    },
    pressed: { opacity: 0.78 },
  });
}