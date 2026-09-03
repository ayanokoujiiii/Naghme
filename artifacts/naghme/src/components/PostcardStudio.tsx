import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useColors } from '@/hooks/useColors';
import { withAlpha } from '@/src/player/coverColors';

interface PostcardStudioProps {
  visible: boolean;
  title: string;
  lyrics: string;
  coverImage: string | null;
  artistName?: string;
  onClose: () => void;
}

type StudioStep = 'selector' | 'editor';
type BackgroundKind = 'cover' | 'custom' | 'solid';
type TextAlignment = 'right' | 'center' | 'left';
type FontChoice = 'serif' | 'classic' | 'soft' | 'bold';
type ExportFormat = 'jpg' | 'png';
type FilterName = 'paper' | 'sepia' | 'grain';

const stickerOptions = ['🌸', '🎶', '🍂', '🌿', '🕊️'];
const filterOptions: Array<{ value: FilterName; label: string }> = [
  { value: 'paper', label: 'کاغذ قدیمی' },
  { value: 'sepia', label: 'سپیا' },
  { value: 'grain', label: 'دانه‌دار' },
];
const fontOptions: Array<{ value: FontChoice; label: string; sample: string }> = [
  { value: 'serif', label: 'کلاسیک', sample: 'نستعلیق' },
  { value: 'classic', label: 'رمانتیک', sample: 'غزل' },
  { value: 'soft', label: 'نرم', sample: 'آواز' },
  { value: 'bold', label: 'پرقدرت', sample: 'نغمه' },
];

export function PostcardStudio({
  visible,
  title,
  lyrics,
  coverImage,
  artistName,
  onClose,
}: PostcardStudioProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const shotRef = useRef<ViewShot | null>(null);
  const [step, setStep] = useState<StudioStep>('selector');
  const [selectedLyrics, setSelectedLyrics] = useState<string>(lyrics);
  const [backgroundKind, setBackgroundKind] = useState<BackgroundKind>('cover');
  const [customBackgroundUri, setCustomBackgroundUri] = useState<string | null>(null);
  const [solidBackground, setSolidBackground] = useState<string>(colors.card);
  const [fontChoice, setFontChoice] = useState<FontChoice>('serif');
  const [alignment, setAlignment] = useState<TextAlignment>('center');
  const [stickers, setStickers] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterName[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('jpg');
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const toastProgress = useSharedValue(0);
  const postcardWidth = Math.min(Math.max(width - 32, 280), 360);
  const postcardHeight = postcardWidth * 1.25;

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastProgress.value,
    transform: [{ translateY: (1 - toastProgress.value) * 18 }],
  }));

  useEffect(() => {
    if (!visible) return;
    setStep('selector');
    setSelectedLyrics(lyrics);
    setBackgroundKind('cover');
    setCustomBackgroundUri(null);
    setFontChoice('serif');
    setAlignment('center');
    setStickers([]);
    setActiveFilters([]);
    setExportFormat('jpg');
  }, [lyrics, visible]);

  useEffect(() => {
    if (!toastMessage) return;
    toastProgress.value = withSequence(
      withTiming(1, { duration: 220 }),
      withDelay(2400, withTiming(0, { duration: 260 })),
    );
    const timeout = setTimeout(() => setToastMessage(''), 2900);
    return () => clearTimeout(timeout);
  }, [toastMessage, toastProgress]);

  const showToast = (message: string) => {
    setToastMessage('');
    requestAnimationFrame(() => setToastMessage(message));
  };

  const pickCustomBackground = async () => {
    try {
      let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      if (!permission.granted) {
        showToast(
          permission.canAskAgain
            ? 'برای انتخاب تصویر، اجازه‌ی دسترسی به گالری لازم است.'
            : 'دسترسی گالری رد شده است؛ آن را از تنظیمات فعال کن.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.92,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      setCustomBackgroundUri(result.assets[0].uri);
      setBackgroundKind('custom');
    } catch {
      showToast('انتخاب تصویر پس‌زمینه انجام نشد.');
    }
  };

  const toggleSticker = (sticker: string) => {
    setStickers((current) =>
      current.includes(sticker)
        ? current.filter((item) => item !== sticker)
        : current.length < 2
          ? [...current, sticker]
          : [current[1], sticker],
    );
  };

  const toggleFilter = (filter: FilterName) => {
    setActiveFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter],
    );
  };

  const savePostcard = async () => {
    if (saving) return;
    if (!selectedLyrics.trim()) {
      showToast('اول بخشی از شعر را برای کارت‌پستال انتخاب کن.');
      return;
    }
    if (Platform.OS === 'web') {
      showToast('ذخیره در گالری روی نسخه‌ی وب در دسترس نیست.');
      return;
    }

    const target = shotRef.current;
    if (!target) {
      showToast('بوم عکس‌نوشته آماده نیست.');
      return;
    }

    setSaving(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        showToast(
          permission.canAskAgain
            ? 'برای ذخیره، اجازه‌ی دسترسی به گالری لازم است.'
            : 'دسترسی گالری رد شده است؛ آن را از تنظیمات فعال کن.',
        );
        return;
      }

      const uri = await captureRef(target, {
        format: exportFormat,
        quality: 1.0,
        result: 'tmpfile',
      });
      await MediaLibrary.saveToLibraryAsync(uri);
      showToast(`عکس‌نوشته با فرمت ${exportFormat.toUpperCase()} ذخیره شد.`);
    } catch {
      showToast('ذخیره‌ی عکس‌نوشته انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  const solidColors = [colors.card, colors.accent, colors.secondary, colors.background];
  const fontStyle = getFontStyle(fontChoice);
  const backgroundUri =
    backgroundKind === 'custom' ? customBackgroundUri : backgroundKind === 'cover' ? coverImage : null;
  const canvasBackgroundStyle =
    backgroundKind === 'solid' ? { backgroundColor: solidBackground } : undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>استودیو شعر / نسخه‌ی حرفه‌ای</Text>
            <Text style={styles.headerTitle}>کارت‌پستال نستعلیق</Text>
          </View>
          <Pressable
            testID="postcard-close"
            accessibilityRole="button"
            accessibilityLabel="بستن استودیو عکس‌نوشته"
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Feather name="x" size={21} color={colors.foreground} />
          </Pressable>
        </View>

        {step === 'selector' ? (
          <ScrollView
            contentContainerStyle={[
              styles.selectorContent,
              { paddingBottom: insets.bottom + 28 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.selectorIcon}>
              <Feather name="edit-3" size={25} color={colors.primary} />
            </View>
            <Text style={styles.selectorTitle}>بخشی را که می‌خواهی نگه دار</Text>
            <Text style={styles.selectorCopy}>
              متن کامل از قبل آماده است؛ خط‌های اضافی را پاک کن تا کارت‌پستال دقیقاً برای همین لحظه باشد.
            </Text>
            <TextInput
              testID="postcard-lyrics-selector"
              multiline
              value={selectedLyrics}
              onChangeText={setSelectedLyrics}
              placeholder="بخشی از شعر را بنویس..."
              placeholderTextColor={colors.mutedForeground}
              selectionColor={colors.primary}
              textAlign="right"
              textAlignVertical="top"
              style={styles.selectorInput}
            />
            <View style={styles.selectorCounter}>
              <Text style={styles.selectorCounterText}>{selectedLyrics.trim().length} نویسه</Text>
              <Feather name="align-right" size={16} color={colors.mutedForeground} />
            </View>
            <Pressable
              testID="postcard-open-editor"
              accessibilityRole="button"
              disabled={!selectedLyrics.trim()}
              onPress={() => setStep('editor')}
              style={({ pressed }) => [
                styles.primaryAction,
                !selectedLyrics.trim() && styles.disabledAction,
                pressed && styles.pressed,
              ]}
            >
              <Feather name="arrow-left" size={18} color={colors.primaryForeground} />
              <Text style={styles.primaryActionText}>ادامه به استودیو</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.editorContent,
              { paddingBottom: insets.bottom + 30 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <ViewShot
              ref={shotRef}
              options={{ result: 'tmpfile' }}
              style={[
                styles.postcard,
                canvasBackgroundStyle,
                { width: postcardWidth, height: postcardHeight },
              ]}
            >
              {backgroundUri ? (
                <Image
                  source={{ uri: backgroundUri }}
                  style={styles.backgroundImage}
                  blurRadius={50}
                  resizeMode="cover"
                />
              ) : null}
              {!backgroundUri && backgroundKind !== 'solid' ? (
                <View style={[styles.backgroundFallback, canvasBackgroundStyle]} />
              ) : null}
              <LinearGradient
                pointerEvents="none"
                colors={[
                  withAlpha(colors.background, 0.08),
                  withAlpha(colors.background, 0.46),
                  withAlpha(colors.background, 0.9),
                ]}
                style={StyleSheet.absoluteFill}
              />
              <View pointerEvents="none" style={styles.canvasFrame}>
                {activeFilters.includes('paper') ? <View style={styles.paperFilter} /> : null}
                {activeFilters.includes('sepia') ? <View style={styles.sepiaFilter} /> : null}
                {activeFilters.includes('grain') ? <View style={styles.grainFilter} /> : null}
                <View style={styles.canvasContent}>
                  <View style={styles.stickerRow}>
                    <Text style={styles.stickerText}>{stickers[0] ?? ''}</Text>
                  </View>
                  <View style={styles.poetryBlock}>
                    <Text style={styles.postcardTitle} numberOfLines={2}>{title}</Text>
                    {artistName ? <Text style={styles.postcardArtist}>{artistName}</Text> : null}
                    <View style={styles.divider} />
                    <Text
                      style={[
                        styles.poetryText,
                        fontStyle,
                        { textAlign: alignment },
                      ]}
                    >
                      {selectedLyrics.trim()}
                    </Text>
                  </View>
                  <View style={styles.footerBlock}>
                    <Text style={styles.stickerText}>{stickers[1] ?? ''}</Text>
                    <Text style={styles.watermark}>Naghme</Text>
                  </View>
                </View>
              </View>
            </ViewShot>

            <View style={styles.editorMeta}>
              <Text style={styles.editorHint}>بوم ۴:۵ / آماده برای اشتراک‌گذاری</Text>
              <Pressable
                testID="postcard-back-to-selector"
                accessibilityRole="button"
                onPress={() => setStep('selector')}
                style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
              >
                <Feather name="edit-3" size={14} color={colors.primary} />
                <Text style={styles.textActionLabel}>ویرایش شعر</Text>
              </Pressable>
            </View>

            <View style={styles.toolbarShell}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.toolbar}
              >
                <ToolbarButton
                  icon="image"
                  label="کاور قطعه"
                  selected={backgroundKind === 'cover'}
                  colors={colors}
                  styles={styles}
                  onPress={() => setBackgroundKind('cover')}
                />
                <ToolbarButton
                  icon="upload"
                  label="تصویر من"
                  selected={backgroundKind === 'custom'}
                  colors={colors}
                  styles={styles}
                  onPress={() => void pickCustomBackground()}
                />
                <ToolbarButton
                  icon="droplet"
                  label="رنگ"
                  selected={backgroundKind === 'solid'}
                  colors={colors}
                  styles={styles}
                  onPress={() => setBackgroundKind('solid')}
                />
                <ToolbarButton
                  icon="type"
                  label="فونت"
                  selected={false}
                  colors={colors}
                  styles={styles}
                  onPress={() => setFontChoice(fontChoice === 'serif' ? 'classic' : 'serif')}
                />
                <ToolbarButton
                  icon="align-center"
                  label="چیدمان"
                  selected={false}
                  colors={colors}
                  styles={styles}
                  onPress={() => setAlignment(alignment === 'center' ? 'right' : 'center')}
                />
                <ToolbarButton
                  icon="star"
                  label="تزئین"
                  selected={stickers.length > 0}
                  colors={colors}
                  styles={styles}
                  onPress={() => toggleSticker(stickers[0] ?? stickerOptions[0])}
                />
                <ToolbarButton
                  icon="layers"
                  label="فیلتر"
                  selected={activeFilters.length > 0}
                  colors={colors}
                  styles={styles}
                  onPress={() => toggleFilter(activeFilters[0] ?? 'paper')}
                />
              </ScrollView>

              <View style={styles.panelDivider} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.optionRow}
              >
                {backgroundKind === 'solid'
                  ? solidColors.map((color) => (
                      <Pressable
                        key={color}
                        testID={`postcard-color-${color}`}
                        accessibilityRole="button"
                        accessibilityLabel="انتخاب رنگ پس‌زمینه"
                        onPress={() => setSolidBackground(color)}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          solidBackground === color && styles.colorOptionSelected,
                        ]}
                      />
                    ))
                  : null}
                {fontChoice !== null
                  ? fontOptions.map((font) => (
                      <Pressable
                        key={font.value}
                        testID={`postcard-font-${font.value}`}
                        accessibilityRole="button"
                        onPress={() => setFontChoice(font.value)}
                        style={[
                          styles.fontOption,
                          fontChoice === font.value && styles.optionSelected,
                        ]}
                      >
                        <Text style={[styles.fontSample, getFontStyle(font.value)]}>{font.sample}</Text>
                        <Text style={styles.optionLabel}>{font.label}</Text>
                      </Pressable>
                    ))
                  : null}
                {alignment !== null
                  ? (['right', 'center', 'left'] as TextAlignment[]).map((value) => (
                      <Pressable
                        key={value}
                        testID={`postcard-align-${value}`}
                        accessibilityRole="button"
                        onPress={() => setAlignment(value)}
                        style={[
                          styles.alignOption,
                          alignment === value && styles.optionSelected,
                        ]}
                      >
                        <Feather
                          name={value === 'right' ? 'align-right' : value === 'left' ? 'align-left' : 'align-center'}
                          size={17}
                          color={alignment === value ? colors.primary : colors.mutedForeground}
                        />
                        <Text style={styles.optionLabel}>
                          {value === 'right' ? 'راست' : value === 'left' ? 'چپ' : 'وسط'}
                        </Text>
                      </Pressable>
                    ))
                  : null}
                {stickerOptions.map((sticker) => (
                  <Pressable
                    key={sticker}
                    testID={`postcard-sticker-${sticker}`}
                    accessibilityRole="button"
                    onPress={() => toggleSticker(sticker)}
                    style={[styles.stickerOption, stickers.includes(sticker) && styles.optionSelected]}
                  >
                    <Text style={styles.stickerOptionText}>{sticker}</Text>
                  </Pressable>
                ))}
                {filterOptions.map((filter) => (
                  <View
                    key={filter.value}
                    testID={`postcard-filter-${filter.value}`}
                    style={[
                      styles.filterOption,
                      activeFilters.includes(filter.value) && styles.optionSelected,
                    ]}
                  >
                    <Text style={styles.optionLabel}>{filter.label}</Text>
                    <Switch
                      value={activeFilters.includes(filter.value)}
                      onValueChange={() => toggleFilter(filter.value)}
                      trackColor={{ false: colors.secondary, true: colors.accent }}
                      thumbColor={activeFilters.includes(filter.value) ? colors.primary : colors.mutedForeground}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.exportRow}>
              <View style={styles.exportCopy}>
                <Text style={styles.exportTitle}>فرمت خروجی</Text>
                <Text style={styles.exportCaption}>کیفیت نهایی ۱۰۰٪</Text>
              </View>
              <View style={styles.formatSwitch}>
                {(['jpg', 'png'] as ExportFormat[]).map((format) => (
                  <Pressable
                    key={format}
                    testID={`postcard-format-${format}`}
                    accessibilityRole="button"
                    onPress={() => setExportFormat(format)}
                    style={[styles.formatOption, exportFormat === format && styles.formatOptionSelected]}
                  >
                    <Text style={[styles.formatText, exportFormat === format && styles.formatTextSelected]}>
                      {format.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              testID="postcard-save"
              accessibilityRole="button"
              accessibilityLabel="ذخیره عکس‌نوشته در گالری"
              disabled={saving}
              onPress={() => void savePostcard()}
              style={({ pressed }) => [
                styles.saveButton,
                saving && styles.saveButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Feather name="download" size={18} color={colors.primaryForeground} />
                  <Text style={styles.saveButtonText}>ذخیره در گالری</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        )}

        {toastMessage ? (
          <Animated.View style={[styles.toast, toastStyle]} pointerEvents="none">
            <Feather
              name={toastMessage.includes('ذخیره شد') ? 'check-circle' : 'info'}
              size={17}
              color={colors.primary}
            />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

function ToolbarButton({
  icon,
  label,
  selected,
  colors,
  styles,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  selected: boolean;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`postcard-tool-${label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.toolButton, selected && styles.toolButtonSelected]}
    >
      <View style={[styles.toolIcon, selected && styles.toolIconSelected]}>
        <Feather name={icon} size={17} color={selected ? colors.primaryForeground : colors.primary} />
      </View>
      <Text style={[styles.toolLabel, selected && styles.toolLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function getFontStyle(font: FontChoice) {
  if (font === 'classic') return { fontFamily: 'serif', fontStyle: 'italic' as const };
  if (font === 'soft') return { fontFamily: 'sans-serif-light' };
  if (font === 'bold') return { fontFamily: 'sans-serif', fontWeight: '800' as const };
  return { fontFamily: 'serif', fontWeight: '500' as const };
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: 18,
      paddingBottom: 13,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerCopy: { flex: 1, alignItems: 'flex-end' },
    eyebrow: { color: colors.mutedForeground, fontSize: 10, textAlign: 'right', marginBottom: 4 },
    headerTitle: { color: colors.foreground, fontSize: 20, fontWeight: '700', textAlign: 'right' },
    closeButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectorContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 32,
      gap: 12,
    },
    selectorIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    selectorTitle: { color: colors.foreground, fontSize: 22, fontWeight: '700', textAlign: 'center' },
    selectorCopy: { color: colors.mutedForeground, fontSize: 13, lineHeight: 23, textAlign: 'center', maxWidth: 340 },
    selectorInput: {
      width: '100%',
      minHeight: 230,
      padding: 18,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.foreground,
      fontSize: 17,
      lineHeight: 32,
      writingDirection: 'rtl',
    },
    selectorCounter: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 5 },
    selectorCounterText: { color: colors.mutedForeground, fontSize: 11 },
    primaryAction: {
      width: '100%',
      minHeight: 54,
      marginTop: 6,
      borderRadius: 17,
      backgroundColor: colors.primary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },
    primaryActionText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '700' },
    disabledAction: { opacity: 0.45 },
    editorContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 16, paddingTop: 17, gap: 12 },
    postcard: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 24,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: withAlpha(colors.foreground, 0.18),
    },
    backgroundImage: { ...StyleSheet.absoluteFillObject, opacity: 0.92 },
    backgroundFallback: { ...StyleSheet.absoluteFillObject },
    canvasFrame: { ...StyleSheet.absoluteFillObject, padding: 13 },
    canvasContent: {
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'stretch',
      paddingHorizontal: 21,
      paddingVertical: 23,
      borderWidth: 1,
      borderColor: withAlpha(colors.foreground, 0.22),
      borderRadius: 18,
    },
    stickerRow: { minHeight: 30, alignItems: 'flex-start' },
    footerBlock: { minHeight: 35, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
    stickerText: { color: colors.foreground, fontSize: 21, minHeight: 25 },
    poetryBlock: { alignItems: 'stretch', justifyContent: 'center', flex: 1, paddingVertical: 12 },
    postcardTitle: { color: colors.foreground, fontSize: 23, lineHeight: 31, fontWeight: '700', textAlign: 'center' },
    postcardArtist: { color: colors.primary, fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 6 },
    divider: { width: 42, height: 2, borderRadius: 2, backgroundColor: colors.primary, alignSelf: 'center', marginVertical: 16 },
    poetryText: { color: colors.foreground, fontSize: 18, lineHeight: 34, writingDirection: 'rtl' },
    watermark: { color: withAlpha(colors.foreground, 0.72), fontSize: 11, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
    paperFilter: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(224, 198, 150, 0.2)' },
    sepiaFilter: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(112, 66, 20, 0.2)' },
    grainFilter: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.08)', opacity: 0.7 },
    editorMeta: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3 },
    editorHint: { color: colors.mutedForeground, fontSize: 10, textAlign: 'right' },
    textAction: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
    textActionLabel: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    toolbarShell: { width: '100%', borderRadius: 19, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingVertical: 9 },
    toolbar: { flexDirection: 'row-reverse', gap: 7, paddingHorizontal: 9 },
    toolButton: { width: 67, minHeight: 68, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 13, paddingHorizontal: 4 },
    toolButtonSelected: { backgroundColor: colors.accent },
    toolIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
    toolIconSelected: { backgroundColor: colors.primary },
    toolLabel: { color: colors.mutedForeground, fontSize: 10, textAlign: 'center' },
    toolLabelSelected: { color: colors.foreground, fontWeight: '700' },
    panelDivider: { height: 1, backgroundColor: colors.border, marginVertical: 5 },
    optionRow: { minHeight: 60, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 10 },
    colorOption: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: colors.border },
    colorOptionSelected: { borderColor: colors.primary, borderWidth: 3 },
    fontOption: { minWidth: 72, minHeight: 46, alignItems: 'center', justifyContent: 'center', gap: 1, borderRadius: 11, paddingHorizontal: 8 },
    fontSample: { color: colors.foreground, fontSize: 17 },
    optionLabel: { color: colors.mutedForeground, fontSize: 10, textAlign: 'center' },
    optionSelected: { backgroundColor: colors.accent, borderColor: colors.primary, borderWidth: 1 },
    alignOption: { minWidth: 55, minHeight: 46, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 11, paddingHorizontal: 8 },
    stickerOption: { width: 45, height: 45, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    stickerOptionText: { fontSize: 22 },
    filterOption: { minWidth: 105, minHeight: 48, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 11, paddingHorizontal: 6 },
    exportRow: { width: '100%', minHeight: 58, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    exportCopy: { alignItems: 'flex-end' },
    exportTitle: { color: colors.foreground, fontSize: 12, fontWeight: '700', textAlign: 'right' },
    exportCaption: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'right' },
    formatSwitch: { flexDirection: 'row', gap: 5, padding: 4, borderRadius: 12, backgroundColor: colors.secondary },
    formatOption: { minWidth: 45, minHeight: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    formatOptionSelected: { backgroundColor: colors.primary },
    formatText: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700' },
    formatTextSelected: { color: colors.primaryForeground },
    saveButton: { width: '100%', minHeight: 52, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 16, backgroundColor: colors.primary },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '700' },
    toast: { position: 'absolute', left: 20, right: 20, bottom: 24, minHeight: 48, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary, shadowColor: colors.background, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
    toastText: { color: colors.foreground, fontSize: 12, fontWeight: '600', textAlign: 'right' },
    pressed: { opacity: 0.74 },
  });
}