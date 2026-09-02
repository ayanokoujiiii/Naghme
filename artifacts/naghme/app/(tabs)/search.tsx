import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState<string>('');
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 96 },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>پیدا کردن یک خاطره</Text>
          <Text style={styles.title}>جست‌وجو</Text>
        </View>
        <View style={styles.headerIcon}>
          <Feather name="search" size={20} color={colors.primary} />
        </View>
      </View>

      <View style={styles.searchBox}>
        <Feather name="search" size={19} color={colors.mutedForeground} />
        <TextInput
          testID="archive-search-input"
          value={query}
          onChangeText={setQuery}
          placeholder="نام قطعه، آلبوم یا هنرمند"
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
          textAlign="right"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable
            testID="clear-search"
            accessibilityLabel="پاک کردن جست‌وجو"
            onPress={() => setQuery('')}
            hitSlop={10}
          >
            <Feather name="x-circle" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={styles.emptyState}>
        <Feather name="layers" size={26} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>
          {query ? 'نتیجه‌ای برای جست‌وجو نیست' : 'جست‌وجو آماده است'}
        </Text>
        <Text style={styles.emptyCopy}>
          {query
            ? 'وقتی موسیقی‌هایت را اضافه کنی، نتایج اینجا نمایش داده می‌شوند.'
            : 'برای پیدا کردن قطعه‌ها، نام آن‌ها را در بالا بنویس.'}
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    eyebrow: {
      color: colors.mutedForeground,
      fontSize: 13,
      textAlign: 'right',
      marginBottom: 4,
    },
    title: {
      color: colors.foreground,
      fontSize: 34,
      lineHeight: 42,
      fontWeight: '700',
      textAlign: 'right',
    },
    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBox: {
      minHeight: 56,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 11,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 17,
      paddingHorizontal: 16,
    },
    input: {
      flex: 1,
      color: colors.foreground,
      fontSize: 14,
      minHeight: 54,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 26,
      paddingBottom: 80,
    },
    emptyTitle: {
      color: colors.foreground,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 14,
      marginBottom: 8,
    },
    emptyCopy: {
      color: colors.mutedForeground,
      fontSize: 14,
      lineHeight: 24,
      textAlign: 'center',
    },
  });
}