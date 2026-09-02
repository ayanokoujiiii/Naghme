import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';

type ArchiveFormPageProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function ArchiveFormPage({
  title,
  subtitle,
  children,
}: ArchiveFormPageProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            testID="form-close"
            accessibilityLabel="بستن"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Feather name="arrow-right" size={21} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>
        {children}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function FormField({ label, error, ...inputProps }: FormFieldProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        style={[styles.input, inputProps.multiline && styles.multilineInput]}
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.primary}
        textAlign="right"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

type SaveButtonProps = {
  label: string;
  saving: boolean;
  onPress: () => void;
};

export function SaveButton({ label, saving, onPress }: SaveButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      testID="form-save"
      accessibilityRole="button"
      disabled={saving}
      onPress={onPress}
      style={({ pressed }) => [
        styles.saveButton,
        (pressed || saving) && styles.saveButtonPressed,
      ]}
    >
      {saving ? (
        <ActivityIndicator color={colors.primaryForeground} />
      ) : (
        <>
          <Feather name="check" size={18} color={colors.primaryForeground} />
          <Text style={styles.saveText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function FormMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!error && !success) return null;
  return (
    <View
      style={[
        styles.message,
        { backgroundColor: error ? 'rgba(217, 107, 95, 0.14)' : colors.accent },
      ]}
    >
      <Feather
        name={error ? 'alert-circle' : 'check-circle'}
        size={17}
        color={error ? colors.destructive : colors.primary}
      />
      <Text style={[styles.messageText, { color: error ? colors.destructive : colors.accentForeground }]}>
        {error ?? success}
      </Text>
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
      marginBottom: 30,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 13,
    },
    headerCopy: { flex: 1 },
    subtitle: {
      color: colors.mutedForeground,
      fontSize: 13,
      textAlign: 'right',
      marginBottom: 5,
    },
    title: {
      color: colors.foreground,
      fontSize: 29,
      fontWeight: '700',
      textAlign: 'right',
    },
    field: { marginBottom: 18 },
    label: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'right',
      marginBottom: 9,
    },
    input: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.input,
      backgroundColor: colors.card,
      color: colors.foreground,
      paddingHorizontal: 16,
      fontSize: 15,
    },
    multilineInput: {
      minHeight: 112,
      paddingTop: 15,
      textAlignVertical: 'top',
    },
    error: {
      color: colors.destructive,
      fontSize: 12,
      textAlign: 'right',
      marginTop: 6,
    },
    saveButton: {
      minHeight: 56,
      borderRadius: 17,
      backgroundColor: colors.primary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      marginTop: 8,
    },
    saveButtonPressed: { opacity: 0.72 },
    saveText: {
      color: colors.primaryForeground,
      fontSize: 15,
      fontWeight: '700',
    },
    message: {
      minHeight: 48,
      borderRadius: 14,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 14,
      marginBottom: 14,
    },
    messageText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'right',
    },
    pressed: { opacity: 0.72 },
  });
}