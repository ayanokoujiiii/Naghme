import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function ArchiveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
          <Text style={styles.eyebrow}>مجموعه‌ی شخصی</Text>
          <Text style={styles.title}>آرشیو</Text>
        </View>
        <View style={styles.headerIcon}>
          <Feather name="music" size={20} color={colors.primary} />
        </View>
      </View>
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Feather name="disc" size={32} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>آرشیو تو هنوز خالی است</Text>
        <Text style={styles.emptyCopy}>
          در فاز بعدی می‌توانی قطعه‌ها، آلبوم‌ها و هنرمندهای محبوبت را به نغمه اضافه کنی.
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
      marginBottom: 28,
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
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 26,
      paddingBottom: 80,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    emptyTitle: {
      color: colors.foreground,
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 9,
    },
    emptyCopy: {
      color: colors.mutedForeground,
      fontSize: 14,
      lineHeight: 24,
      textAlign: 'center',
    },
  });
}