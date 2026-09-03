import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import {
  fetchAvailableGeminiModels,
  getGeminiApiKey,
  getGeminiModel,
  GeminiModelOption,
  saveGeminiApiKey,
  saveGeminiModel,
} from '@/src/ai/gemini';
import { createArchiveBackup, restoreArchiveBackup } from '@/src/db/portability';

export default function SettingsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [exporting, setExporting] = useState<boolean>(false);
  const [restoring, setRestoring] = useState<boolean>(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [loadingGeminiKey, setLoadingGeminiKey] = useState<boolean>(true);
  const [savingGeminiKey, setSavingGeminiKey] = useState<boolean>(false);
  const [geminiKeyMessage, setGeminiKeyMessage] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<GeminiModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [fetchingModels, setFetchingModels] = useState<boolean>(false);
  const [modelMessage, setModelMessage] = useState<string>('');
  const [modelPickerVisible, setModelPickerVisible] = useState<boolean>(false);

  useEffect(() => {
    void Promise.all([getGeminiApiKey(), getGeminiModel()])
      .then(([apiKey, model]) => {
        setGeminiApiKey(apiKey);
        setSelectedModel(model);
      })
      .catch(() => setGeminiKeyMessage('خواندن تنظیمات Gemini انجام نشد.'))
      .finally(() => setLoadingGeminiKey(false));
  }, []);

  const handleSaveGeminiKey = async () => {
    setSavingGeminiKey(true);
    setGeminiKeyMessage('');
    try {
      await saveGeminiApiKey(geminiApiKey);
      setGeminiApiKey(await getGeminiApiKey());
      setGeminiKeyMessage(
        geminiApiKey.trim() ? 'کلید Gemini روی همین دستگاه ذخیره شد.' : 'کلید Gemini پاک شد.',
      );
    } catch (saveError: unknown) {
      setGeminiKeyMessage(
        saveError instanceof Error ? saveError.message : 'ذخیره‌ی کلید Gemini انجام نشد.',
      );
    } finally {
      setSavingGeminiKey(false);
    }
  };

  const handleFetchModels = async () => {
    if (fetchingModels || savingGeminiKey) return;
    const key = geminiApiKey.trim();
    if (!key) {
      setModelMessage('برای استعلام مدل‌ها ابتدا کلید Gemini را وارد و ذخیره کن.');
      return;
    }

    setFetchingModels(true);
    setModelMessage('');
    try {
      const models = await fetchAvailableGeminiModels(key);
      if (models.length === 0) {
        throw new Error('مدل متنی قابل استفاده‌ای از Gemini دریافت نشد.');
      }
      setAvailableModels(models);
      const currentModel = selectedModel && models.some((model) => model.name === selectedModel)
        ? selectedModel
        : models[0].name;
      setSelectedModel(currentModel);
      await saveGeminiModel(currentModel);
      setModelMessage(`${models.length} مدل متنی پیدا شد. مدل موردنظر را انتخاب کن.`);
      setModelPickerVisible(true);
    } catch (fetchError: unknown) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'استعلام مدل‌ها انجام نشد.';
      console.error('[Gemini settings model fetch]', fetchError);
      setModelMessage(message);
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSelectModel = async (model: GeminiModelOption) => {
    setSelectedModel(model.name);
    setModelPickerVisible(false);
    setModelMessage(`مدل «${model.displayName}» برای پیشنهادها انتخاب شد.`);
    try {
      await saveGeminiModel(model.name);
    } catch (saveError: unknown) {
      const message = saveError instanceof Error ? saveError.message : 'ذخیره‌ی مدل انجام نشد.';
      setModelMessage(message);
    }
  };

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
        `${summary.artists} هنرمند، ${summary.albums} آلبوم، ${summary.roles} نقش، ${summary.credits} مشارکت، ${summary.works} اثر، ${summary.versions} نسخه، ${summary.tracks} قطعه، ${summary.albumTracks} رابطه‌ی آلبوم و قطعه، ${summary.personalRelationships} رابطه‌ی شخصی، ${summary.journalEntries} یادداشت دفترچه و ${summary.listeningHistory} رکورد تاریخچه بازیابی شد.`,
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
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.content}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
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

      <View style={styles.aiCard}>
        <View style={styles.aiCardHeader}>
          <View style={styles.actionIcon}>
            <Feather name="zap" size={20} color={colors.primary} />
          </View>
          <View style={styles.aiCardCopy}>
            <Text style={styles.actionTitle}>پیشنهادهای هوشمند Gemini</Text>
            <Text style={styles.actionDescription}>
              کلید API فقط روی این دستگاه ذخیره می‌شود و برای پیشنهاد قطعه‌ای برای امشب استفاده خواهد شد.
            </Text>
          </View>
        </View>
        <TextInput
          testID="gemini-api-key"
          accessibilityLabel="کلید API جمنای"
          value={geminiApiKey}
          onChangeText={setGeminiApiKey}
          placeholder="کلید API جمنای (Gemini API Key)"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loadingGeminiKey && !savingGeminiKey}
          selectionColor={colors.primary}
          style={styles.aiInput}
          textAlign="left"
        />
        <Pressable
          testID="fetch-gemini-models"
          accessibilityRole="button"
          disabled={loadingGeminiKey || fetchingModels || savingGeminiKey}
          onPress={() => void handleFetchModels()}
          style={({ pressed }) => [
            styles.modelFetchButton,
            (pressed || fetchingModels) && styles.pressed,
          ]}
        >
          {fetchingModels ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="refresh-cw" size={16} color={colors.primary} />
          )}
          <Text style={styles.modelFetchButtonText}>استعلام مدل‌های در دسترس</Text>
        </Pressable>
        {geminiKeyMessage ? <Text style={styles.aiMessage}>{geminiKeyMessage}</Text> : null}
        {availableModels.length ? (
          <View style={styles.modelSelector}>
            <Text style={styles.modelSelectorLabel}>مدل فعال برای پیشنهاد هوشمند</Text>
            <Pressable
              testID="open-gemini-model-picker"
              accessibilityRole="button"
              accessibilityLabel="انتخاب مدل Gemini"
              onPress={() => setModelPickerVisible(true)}
              style={({ pressed }) => [styles.modelPickerButton, pressed && styles.pressed]}
            >
              <Feather name="chevron-down" size={18} color={colors.primary} />
              <View style={styles.modelOptionCopy}>
                <Text style={styles.modelOptionText} numberOfLines={1}>
                  {availableModels.find((model) => model.name === selectedModel)?.displayName ?? selectedModel}
                </Text>
                <Text style={styles.modelName} numberOfLines={1}>{selectedModel}</Text>
              </View>
            </Pressable>
          </View>
        ) : null}
        {modelMessage ? <Text style={styles.aiMessage}>{modelMessage}</Text> : null}
        <Pressable
          testID="save-gemini-api-key"
          accessibilityRole="button"
          disabled={loadingGeminiKey || savingGeminiKey}
          onPress={() => void handleSaveGeminiKey()}
          style={({ pressed }) => [styles.aiButton, pressed && styles.pressed]}
        >
          {savingGeminiKey ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Feather name="lock" size={16} color={colors.primaryForeground} />
              <Text style={styles.aiButtonText}>ذخیره‌ی کلید Gemini</Text>
            </>
          )}
        </Pressable>
        <Text style={styles.aiHint}>
          بدون کلید هم پیشنهاد محلی نغمه فعال است. برای حذف کلید، فیلد را خالی ذخیره کن.
        </Text>
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
      </KeyboardAwareScrollViewCompat>
      <Modal
        visible={modelPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModelPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="بستن انتخاب مدل"
            style={styles.modalDismissArea}
            onPress={() => setModelPickerVisible(false)}
          />
          <View style={styles.modelModal}>
            <View style={styles.modalHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="بستن"
                onPress={() => setModelPickerVisible(false)}
                hitSlop={10}
              >
                <Feather name="x" size={21} color={colors.foreground} />
              </Pressable>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalTitle}>انتخاب مدل Gemini</Text>
                <Text style={styles.modalCaption}>{availableModels.length} مدل متنی در دسترس است</Text>
              </View>
            </View>
            <ScrollView
              style={styles.modelModalScroll}
              contentContainerStyle={styles.modelModalContent}
              showsVerticalScrollIndicator
            >
              {availableModels.map((model) => {
                const selected = selectedModel === model.name;
                return (
                  <Pressable
                    key={model.name}
                    testID={`gemini-model-${model.name}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => void handleSelectModel(model)}
                    style={({ pressed }) => [
                      styles.modelOption,
                      selected && styles.modelOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.modelOptionCopy}>
                      <Text
                        style={[styles.modelOptionText, selected && styles.modelOptionTextSelected]}
                        numberOfLines={1}
                      >
                        {model.displayName}
                      </Text>
                      <Text style={styles.modelName} numberOfLines={1}>{model.name}</Text>
                    </View>
                    <Feather
                      name={selected ? 'check-circle' : 'circle'}
                      size={18}
                      color={selected ? colors.primaryForeground : colors.mutedForeground}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    aiCard: { padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 28 },
    aiCardHeader: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 },
    aiCardCopy: { flex: 1, alignItems: 'flex-end' },
    aiInput: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.input, backgroundColor: colors.secondary, color: colors.foreground, fontSize: 13, paddingHorizontal: 14, marginTop: 15 },
    aiMessage: { color: colors.primary, fontSize: 12, lineHeight: 20, textAlign: 'right', marginTop: 9 },
    aiButton: { minHeight: 46, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, marginTop: 12 },
    aiButtonText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
    modelFetchButton: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.secondary, borderRadius: 13, borderWidth: 1, borderColor: colors.primary, marginTop: 10 },
    modelFetchButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    modelSelector: { marginTop: 15, gap: 8 },
    modelSelectorLabel: { color: colors.foreground, fontSize: 12, fontWeight: '700', textAlign: 'right' },
    modelPickerButton: { minHeight: 58, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.secondary },
    modelOption: { minHeight: 52, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary },
    modelOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    modelOptionCopy: { flex: 1, alignItems: 'flex-end' },
    modelOptionText: { color: colors.foreground, fontSize: 12, fontWeight: '700', textAlign: 'right' },
    modelOptionTextSelected: { color: colors.primaryForeground },
    modelName: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'right' },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.58)' },
    modalDismissArea: { flex: 1 },
    modelModal: { maxHeight: '78%', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.background },
    modalHeader: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalHeaderCopy: { flex: 1, alignItems: 'flex-end' },
    modalTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', textAlign: 'right' },
    modalCaption: { color: colors.mutedForeground, fontSize: 12, marginTop: 4, textAlign: 'right' },
    modelModalScroll: { marginTop: 12 },
    modelModalContent: { gap: 8, paddingBottom: 8 },
    aiHint: { color: colors.mutedForeground, fontSize: 11, lineHeight: 18, textAlign: 'right', marginTop: 11 },
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