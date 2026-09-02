import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { createArchiveBackup, restoreArchiveBackup } from '@/src/db/portability';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [exporting, setExporting] = useState<boolean>(false);
  const [restoring, setRestoring] = useState<boolean>(false);

  const exportArchive = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('خروجی در دسترس نیست', 'خروجی گرفتن از آرشیو را در برنامه‌ی Android انجام بده.');
      return;
    }
    setExporting(true);
    try {
      const json = await createArchiveBackup();
      const directory = FileSystem.documentDirectory;
      if (!directory) throw new Error('مسیر ذخیره‌سازی دستگاه پیدا نشد.');
      const fileUri = `${directory}naghme_backup.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('فایل آماده شد', 'فایل پشتیبان در پوشه‌ی اسناد برنامه ذخیره شد.');
        return;
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'خروجی آرشیو نغمه',
        UTI: 'public.json',
      });
    } catch (exportError: unknown) {
      const message = exportError instanceof Error ? exportError.message : 'خروجی گرفتن انجام نشد.';
      Alert.alert('خروجی گرفتن انجام نشد', message);
    } finally {
      setExporting(false);
    }
  };

  const restoreArchive = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('بازیابی در دسترس نیست', 'بازیابی آرشیو را در برنامه‌ی Android انجام بده.');
      return;
    }
    setRestoring(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) throw new Error('فایلی انتخاب نشد.');
      const json = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const summary = await restoreArchiveBackup(json);
      Alert.alert(
        'بازیابی انجام شد',
        `${summary.artists} هنرمند، ${summary.albums} آلبوم، ${summary.tracks} قطعه و ${summary.personalRelationships} رابطه‌ی شخصی بازیابی شد.`,
        [{ text: 'باشه', onPress: () => router.back() }],
      );
    } catch (restoreError: unknown) {
      const message =
        restoreError instanceof Error ? restoreError.message : 'بازیابی اطلاعات انجام نشد.';
      Alert.alert('بازیابی انجام نشد', message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 38 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          testID="settings-back"
          accessibilityRole="button"
          accessibilityLabel="بازگشت"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Feather name="arrow-right" size={21} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>شخصی‌سازی نغمه</Text>
          <Text style={styles.title}>تنظیمات</Text>
        </View>
        <View style={styles.headerIcon}>
          <Feather name="settings" size={21} color={colors.primary} />
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Feather name="shield" size={19} color={colors.primary} />
        </View>
        <Text style={styles.infoText}>آرشیو تو روی دستگاه نگهداری می‌شود و کنترل داده‌ها همیشه دست خودت است.</Text>
      </View>

      <Text style={styles.sectionTitle}>مدیریت داده‌ها</Text>
      <View style={styles.actionCard}>
        <View style={styles.actionIcon}>
          <Feather name="download" size={20} color={colors.primary} />
        </View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>خروجی گرفتن از آرشیو</Text>
          <Text style={styles.actionDescription}>یک فایل JSON از هنرمندها، آلبوم‌ها، قطعه‌ها و رابطه‌های شخصی بساز.</Text>
        </View>
        <Pressable
          testID="export-archive"
          accessibilityRole="button"
          accessibilityLabel="خروجی گرفتن از آرشیو"
          disabled={exporting}
          onPress={() => void exportArchive()}
          style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Feather name="share-2" size={16} color={colors.primaryForeground} />
              <Text style={styles.exportButtonText}>ساخت فایل پشتیبان</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.actionCard}>
        <View style={styles.actionIcon}>
          <Feather name="upload" size={20} color={colors.primary} />
        </View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>بازیابی اطلاعات</Text>
          <Text style={styles.actionDescription}>یک فایل پشتیبان JSON را انتخاب کن تا اطلاعات آرشیو روی این دستگاه بازنویسی شود.</Text>
        </View>
        <Pressable
          testID="restore-archive"
          accessibilityRole="button"
          accessibilityLabel="بازیابی اطلاعات از فایل"
          disabled={restoring}
          onPress={() => void restoreArchive()}
          style={({ pressed }) => [styles.restoreButton, pressed && styles.pressed]}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Feather name="folder" size={16} color={colors.primary} />
              <Text style={styles.restoreButtonText}>بازیابی اطلاعات از فایل</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.footerNote}>
        <Feather name="file-text" size={16} color={colors.mutedForeground} />
        <Text style={styles.footerText}>نام فایل خروجی: naghme_backup.json</Text>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 26 },
    backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    headerCopy: { flex: 1 },
    eyebrow: { color: colors.mutedForeground, fontSize: 13, textAlign: 'right', marginBottom: 4 },
    title: { color: colors.foreground, fontSize: 32, lineHeight: 40, fontWeight: '700', textAlign: 'right' },
    headerIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    infoCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11, padding: 15, borderRadius: 18, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.border, marginBottom: 30 },
    infoIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    infoText: { flex: 1, color: colors.accentForeground, fontSize: 13, lineHeight: 22, textAlign: 'right' },
    sectionTitle: { color: colors.foreground, fontSize: 20, fontWeight: '700', textAlign: 'right', marginBottom: 13 },
    actionCard: { alignItems: 'center', padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    actionIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    actionCopy: { alignItems: 'center' },
    actionTitle: { color: colors.cardForeground, fontSize: 16, fontWeight: '700', textAlign: 'center' },
    actionDescription: { color: colors.mutedForeground, fontSize: 13, lineHeight: 22, textAlign: 'center', marginTop: 7 },
    exportButton: { minHeight: 46, width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, marginTop: 18, paddingHorizontal: 14 },
    exportButtonText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
    restoreButton: { minHeight: 46, width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.secondary, borderRadius: 14, borderWidth: 1, borderColor: colors.primary, marginTop: 18, paddingHorizontal: 14 },
    restoreButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    footerNote: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18 },
    footerText: { color: colors.mutedForeground, fontSize: 12 },
    pressed: { opacity: 0.74 },
  });
}