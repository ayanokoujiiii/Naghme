import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ComponentProps, type ReactNode, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';

type DetailShellProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon: ComponentProps<typeof Feather>['name'];
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function DetailShell({
  eyebrow,
  title,
  subtitle,
  icon,
  children,
  onEdit,
  onDelete,
}: DetailShellProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: (Platform.OS === 'web' ? 67 : 0) + 16,
            paddingBottom: (Platform.OS === 'web' ? 34 : 0) + 30,
          },
        ]}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            testID="detail-back"
            accessibilityLabel="بازگشت"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Feather name="arrow-right" size={21} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title} numberOfLines={3}>
              {title}
            </Text>
            {subtitle ? <Text style={styles.titleSubtitle} numberOfLines={2}>{subtitle}</Text> : null}
          </View>
          <View style={styles.heroIcon}>
            <Feather name={icon} size={24} color={colors.primary} />
          </View>
        </View>

        {children}

        {onEdit || onDelete ? (
          <View style={styles.actions}>
            {onEdit ? (
              <Pressable
                testID="detail-edit"
                accessibilityRole="button"
                onPress={onEdit}
                style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
              >
                <Feather name="edit-2" size={17} color={colors.primaryForeground} />
                <Text style={styles.editText}>ویرایش</Text>
              </Pressable>
            ) : null}
            {onDelete ? (
              <Pressable
                testID="detail-delete"
                accessibilityRole="button"
                onPress={onDelete}
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
              >
                <Feather name="trash-2" size={17} color={colors.destructive} />
                <Text style={styles.deleteText}>حذف</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </SafeAreaView>
  );
}

export function DetailCard({ children }: { children: ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.card}>{children}</View>;
}

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.rowValue}>{value}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
  );
}

export function SectionHeading({
  title,
  caption,
}: {
  title: string;
  caption?: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, flexGrow: 1 },
    header: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-start',
      marginBottom: 28,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    headerCopy: { flex: 1, paddingHorizontal: 3 },
    eyebrow: {
      color: colors.mutedForeground,
      fontSize: 13,
      textAlign: 'right',
      marginBottom: 5,
    },
    title: {
      color: colors.foreground,
      fontSize: 28,
      lineHeight: 35,
      fontWeight: '700',
      textAlign: 'right',
    },
    titleSubtitle: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'right',
      marginTop: 7,
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 20,
      padding: 16,
      marginBottom: 18,
    },
    row: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 36,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLabel: {
      color: colors.mutedForeground,
      fontSize: 13,
      textAlign: 'right',
    },
    rowValue: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'right',
      flexShrink: 1,
      marginLeft: 16,
    },
    sectionHeading: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      color: colors.foreground,
      fontSize: 19,
      fontWeight: '700',
      textAlign: 'right',
    },
    sectionCaption: {
      color: colors.mutedForeground,
      fontSize: 12,
      textAlign: 'right',
    },
    actions: {
      flexDirection: 'row-reverse',
      gap: 10,
      marginTop: 'auto',
      paddingTop: 12,
    },
    editButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: colors.primary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    editText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: '700',
    },
    deleteButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.destructive,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    deleteText: {
      color: colors.destructive,
      fontSize: 14,
      fontWeight: '700',
    },
    pressed: { opacity: 0.72 },
  });
}