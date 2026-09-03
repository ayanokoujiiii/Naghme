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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
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
type ExportFormat = 'jpg' | 'png';
type StudioMenu = 'ratio' | 'background' | 'text' | 'decorations' | 'filters' | null;
type FilterName =
  | 'grayscale'
  | 'vintage'
  | 'sepia'
  | 'cool'
  | 'warm'
  | 'invert'
  | 'noise'
  | 'contrast';
type CanvasRatio = 'square' | 'portrait' | 'landscape' | 'story' | 'custom';
type PersianFont =
  | 'Lalezar'
  | 'Vazirmatn'
  | 'Amiri'
  | 'Cairo'
  | 'Rakkas'
  | 'ElMessiri'
  | 'Tajawal'
  | 'Lateef'
  | 'ArefRuqaa'
  | 'NotoSansArabic';

interface CustomSticker {
  id: string;
  uri: string;
  opacity: number;
  borderRadius: number;
}

const ratioOptions: Array<{ value: CanvasRatio; label: string; caption: string; ratio: number }> = [
  { value: 'square', label: '۱:۱', caption: 'مربع', ratio: 1 },
  { value: 'portrait', label: '۴:۵', caption: 'پرتره', ratio: 0.8 },
  { value: 'landscape', label: '۱۶:۹', caption: 'افقی', ratio: 16 / 9 },
  { value: 'story', label: '۹:۱۶', caption: 'استوری', ratio: 9 / 16 },
  { value: 'custom', label: 'سفارشی', caption: 'ابعاد من', ratio: 1 },
];

const fontOptions: Array<{ value: PersianFont; label: string; sample: string }> = [
  { value: 'Lalezar', label: 'Lalezar / لاله‌زار', sample: 'نغمه' },
  { value: 'Vazirmatn', label: 'Vazirmatn / وزیر', sample: 'شعر' },
  { value: 'Amiri', label: 'Amiri / امیری', sample: 'غزل' },
  { value: 'Cairo', label: 'Cairo / قاهره', sample: 'آواز' },
  { value: 'Rakkas', label: 'Rakkas / رقاص', sample: 'نغمه' },
  { value: 'ElMessiri', label: 'El Messiri / المسیری', sample: 'قصه' },
  { value: 'Tajawal', label: 'Tajawal / تجوال', sample: 'شب' },
  { value: 'Lateef', label: 'Lateef / لطیف', sample: 'شعر' },
  { value: 'ArefRuqaa', label: 'Aref Ruqaa / عارف رقعه', sample: 'دل' },
  { value: 'NotoSansArabic', label: 'Noto Sans Arabic', sample: 'آرشیو' },
];

const filterOptions: Array<{ value: FilterName; label: string; icon: React.ComponentProps<typeof Feather>['name'] }> = [
  { value: 'grayscale', label: 'سیاه‌وسفید', icon: 'minus' },
  { value: 'vintage', label: 'وینتیج', icon: 'camera' },
  { value: 'sepia', label: 'سپیا', icon: 'sun' },
  { value: 'cool', label: 'سرد', icon: 'cloud' },
  { value: 'warm', label: 'گرم', icon: 'sunrise' },
  { value: 'invert', label: 'معکوس', icon: 'refresh-cw' },
  { value: 'noise', label: 'نویز', icon: 'grid' },
  { value: 'contrast', label: 'کنتراست', icon: 'sliders' },
];

const menuOptions: Array<{
  value: Exclude<StudioMenu, null>;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}> = [
  { value: 'ratio', label: 'ابعاد', icon: 'maximize-2' },
  { value: 'background', label: 'پس‌زمینه', icon: 'image' },
  { value: 'text', label: 'متن', icon: 'type' },
  { value: 'decorations', label: 'تزئینات', icon: 'star' },
  { value: 'filters', label: 'فیلترها', icon: 'layers' },
];

const hueColors = ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'] as const;
const elegantPalette = [
  '#F6F0E8',
  '#E5A35D',
  '#C96B4B',
  '#9E4F43',
  '#6F303A',
  '#493047',
  '#263D4A',
  '#315A5A',
  '#496A57',
  '#78845A',
  '#B9A77B',
  '#242020',
  '#151A24',
] as const;
type PickerTarget = 'text' | 'background' | null;
type TextSubMenu = 'color' | 'font' | 'alignment';
type BackgroundSubMenu = 'type' | 'colors' | 'settings';

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
  const shotRef = useRef<View | null>(null);
  const [step, setStep] = useState<StudioStep>('selector');
  const [selectedLyrics, setSelectedLyrics] = useState<string>(lyrics);
  const [ratio, setRatio] = useState<CanvasRatio>('portrait');
  const [customWidth, setCustomWidth] = useState<string>('1080');
  const [customHeight, setCustomHeight] = useState<string>('1350');
  const [activeMenu, setActiveMenu] = useState<StudioMenu>(null);
  const [textSubMenu, setTextSubMenu] = useState<TextSubMenu>('color');
  const [backgroundSubMenu, setBackgroundSubMenu] = useState<BackgroundSubMenu>('type');
  const [backgroundKind, setBackgroundKind] = useState<BackgroundKind>('cover');
  const [customBackgroundUri, setCustomBackgroundUri] = useState<string | null>(null);
  const [solidBackground, setSolidBackground] = useState<string>(colors.card);
  const [blurRadius, setBlurRadius] = useState<number>(28);
  const [fontChoice, setFontChoice] = useState<PersianFont>('Vazirmatn');
  const [alignment, setAlignment] = useState<TextAlignment>('center');
  const [hue, setHue] = useState<number>(30);
  const [saturation, setSaturation] = useState<number>(0.42);
  const [brightness, setBrightness] = useState<number>(0.96);
  const [customStickers, setCustomStickers] = useState<CustomSticker[]>([]);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [activeFilters, setActiveFilters] = useState<FilterName[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('jpg');
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const toastProgress = useSharedValue(0);
  const postcardWidth = Math.min(Math.max(width - 32, 280), 360);
  const customWidthNumber = Math.min(4096, Math.max(120, Number.parseInt(customWidth, 10) || 1080));
  const customHeightNumber = Math.min(4096, Math.max(120, Number.parseInt(customHeight, 10) || 1350));
  const selectedRatio =
    ratio === 'custom'
      ? { value: 'custom' as const, label: 'سفارشی', caption: `${customWidthNumber} × ${customHeightNumber}`, ratio: customWidthNumber / customHeightNumber }
      : ratioOptions.find((item) => item.value === ratio) ?? ratioOptions[1];
  const postcardHeight = postcardWidth / selectedRatio.ratio;
  const selectedTextColor = hsvToHex(hue, saturation, brightness);
  const backgroundUri =
    backgroundKind === 'custom' ? customBackgroundUri : backgroundKind === 'cover' ? coverImage : null;

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastProgress.value,
    transform: [{ translateY: (1 - toastProgress.value) * 18 }],
  }));

  useEffect(() => {
    if (!visible) return;
    setStep('selector');
    setSelectedLyrics(lyrics);
    setRatio('portrait');
    setCustomWidth('1080');
    setCustomHeight('1350');
    setActiveMenu(null);
    setTextSubMenu('color');
    setBackgroundSubMenu('type');
    setBackgroundKind('cover');
    setCustomBackgroundUri(null);
    setBlurRadius(28);
    setFontChoice('Vazirmatn');
    setAlignment('center');
    setHue(30);
    setSaturation(0.42);
    setBrightness(0.96);
    setCustomStickers([]);
    setActiveStickerId(null);
    setPickerTarget(null);
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
      if (!permission.granted) permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
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

  const pickCustomSticker = async () => {
    try {
      let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!permission.granted) permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast('برای افزودن استیکر، اجازه‌ی دسترسی به گالری لازم است.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.95,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      const uri = result.assets[0].uri;
      setCustomStickers((current) => [
        ...current,
        { id: `${Date.now()}-${current.length}`, uri, opacity: 1, borderRadius: 14 },
      ]);
    } catch {
      showToast('افزودن استیکر انجام نشد.');
    }
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
      console.error('[Naghme postcard export] requesting media-library permission');
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        showToast(
          permission.canAskAgain
            ? 'برای ذخیره، اجازه‌ی دسترسی به گالری لازم است.'
            : 'دسترسی گالری رد شده است؛ آن را از تنظیمات فعال کن.',
        );
        return;
      }
      console.error('[Naghme postcard export] permission granted; capturing canvas', {
        format: exportFormat,
        width: postcardWidth,
        height: postcardHeight,
      });
      const uri = await captureRef(target, {
        format: exportFormat,
        quality: 1.0,
        result: 'tmpfile',
      });
      console.error('[Naghme postcard export] capture complete', uri);
      await MediaLibrary.saveToLibraryAsync(uri);
      console.error('[Naghme postcard export] saved to library');
      showToast(`عکس‌نوشته با فرمت ${exportFormat.toUpperCase()} ذخیره شد.`);
    } catch (error: unknown) {
      console.error('[Naghme postcard export] failed', error);
      showToast('ذخیره‌ی عکس‌نوشته انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  const backgroundStyle = backgroundKind === 'solid' ? { backgroundColor: solidBackground } : undefined;
  const textStyle = getFontStyle(fontChoice);

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
            <Text style={styles.eyebrow}>استودیو شعر / نسخه‌ی Canva</Text>
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
            contentContainerStyle={[styles.selectorContent, { paddingBottom: insets.bottom + 28 }]}
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
            contentContainerStyle={[styles.editorContent, { paddingBottom: insets.bottom + 30 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.canvasHintRow}>
              <Text style={styles.canvasHint}>بوم {selectedRatio.label} / متن و استیکر قابل‌حرکت</Text>
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

            <View
              ref={shotRef}
              collapsable={false}
              testID="postcard-capture-canvas"
              style={[styles.postcard, backgroundStyle, { width: postcardWidth, height: postcardHeight }]}
            >
              {backgroundUri ? (
                <Image
                  source={{ uri: backgroundUri }}
                  style={styles.backgroundImage}
                  blurRadius={blurRadius}
                  resizeMode="cover"
                />
              ) : backgroundKind !== 'solid' ? (
                <View style={[styles.backgroundFallback, backgroundStyle]} />
              ) : null}
              <LinearGradient
                pointerEvents="none"
                colors={[
                  withAlpha(colors.background, 0.06),
                  withAlpha(colors.background, 0.38),
                  withAlpha(colors.background, 0.86),
                ]}
                style={StyleSheet.absoluteFill}
              />
              {activeFilters.map((filter) => (
                <View
                  key={filter}
                  pointerEvents="none"
                  style={[styles.filterOverlay, { backgroundColor: filterOverlayColor(filter) }]}
                />
              ))}
              <View pointerEvents="box-none" style={styles.canvasFrame}>
                <View pointerEvents="box-none" style={styles.canvasContent}>
                  <Text style={styles.watermark}>Naghme</Text>
                  <DraggableLyrics
                    title={title}
                    artistName={artistName}
                    lyrics={selectedLyrics}
                    textColor={selectedTextColor}
                    textStyle={textStyle}
                    alignment={alignment}
                    width={postcardWidth - 68}
                    top={postcardHeight * 0.32}
                    styles={styles}
                  />
                  {customStickers.map((sticker, index) => (
                    <DraggableSticker
                      key={sticker.id}
                      uri={sticker.uri}
                      initialX={(index % 2 === 0 ? -1 : 1) * (postcardWidth * 0.23)}
                      initialY={postcardHeight * 0.18 + index * 24}
                      opacity={sticker.opacity}
                      borderRadius={sticker.borderRadius}
                      selected={activeStickerId === sticker.id}
                      onSelect={() => setActiveStickerId(sticker.id)}
                      styles={styles}
                    />
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.menuShell}>
              {activeMenu ? (
                <View style={styles.contextPanel}>
                  {activeMenu === 'ratio' ? (
                    <View style={styles.panelStack}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.panelOptions}>
                        {ratioOptions.map((option) => (
                          <ChoiceOption
                            key={option.value}
                            testID={`postcard-ratio-${option.value}`}
                            label={option.label}
                            caption={option.value === 'custom' ? `${customWidthNumber} × ${customHeightNumber}` : option.caption}
                            selected={ratio === option.value}
                            colors={colors}
                            styles={styles}
                            onPress={() => setRatio(option.value)}
                          />
                        ))}
                      </ScrollView>
                      {ratio === 'custom' ? (
                        <View style={styles.dimensionEditor}>
                          <Text style={styles.dimensionTitle}>ابعاد دلخواه بوم</Text>
                          <View style={styles.dimensionInputs}>
                            <TextInput
                              testID="postcard-custom-width"
                              value={customWidth}
                              onChangeText={setCustomWidth}
                              keyboardType="number-pad"
                              placeholder="عرض"
                              placeholderTextColor={colors.mutedForeground}
                              style={styles.dimensionInput}
                            />
                            <TextInput
                              testID="postcard-custom-height"
                              value={customHeight}
                              onChangeText={setCustomHeight}
                              keyboardType="number-pad"
                              placeholder="ارتفاع"
                              placeholderTextColor={colors.mutedForeground}
                              style={styles.dimensionInput}
                            />
                          </View>
                          <Text style={styles.dimensionCaption}>عرض و ارتفاع بر حسب واحد طراحی وارد می‌شود.</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  {activeMenu === 'background' ? (
                    <View style={styles.panelStack}>
                      <SubMenuTabs
                        tabs={[
                          { value: 'type', label: 'نوع' },
                          { value: 'colors', label: 'رنگ‌ها' },
                          { value: 'settings', label: 'تنظیمات' },
                        ]}
                        value={backgroundSubMenu}
                        onChange={setBackgroundSubMenu}
                        colors={colors}
                        styles={styles}
                      />
                      {backgroundSubMenu === 'type' ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.panelOptions}>
                          <ChoiceOption
                            testID="postcard-background-cover"
                            label="کاور قطعه"
                            caption="تصویر آهنگ"
                            icon="image"
                            selected={backgroundKind === 'cover'}
                            colors={colors}
                            styles={styles}
                            onPress={() => setBackgroundKind('cover')}
                          />
                          <ChoiceOption
                            testID="postcard-background-custom"
                            label="تصویر من"
                            caption="از گالری"
                            icon="upload"
                            selected={backgroundKind === 'custom'}
                            colors={colors}
                            styles={styles}
                            onPress={() => void pickCustomBackground()}
                          />
                          <ChoiceOption
                            testID="postcard-background-solid"
                            label="رنگ ساده"
                            caption="پس‌زمینه"
                            icon="droplet"
                            selected={backgroundKind === 'solid'}
                            colors={colors}
                            styles={styles}
                            onPress={() => setBackgroundKind('solid')}
                          />
                        </ScrollView>
                      ) : null}
                      {backgroundSubMenu === 'colors' ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteOptions}>
                          {elegantPalette.map((color) => (
                            <Pressable
                              key={color}
                              testID={`postcard-color-${color}`}
                              accessibilityRole="button"
                              accessibilityLabel="انتخاب رنگ پس‌زمینه"
                              onPress={() => {
                                setSolidBackground(color);
                                setBackgroundKind('solid');
                              }}
                              style={[
                                styles.colorOption,
                                { backgroundColor: color },
                                solidBackground === color && styles.colorOptionSelected,
                              ]}
                            />
                          ))}
                          <Pressable
                            testID="postcard-background-custom-color"
                            accessibilityRole="button"
                            onPress={() => setPickerTarget('background')}
                            style={styles.customColorButton}
                          >
                            <Feather name="sliders" size={15} color={colors.primary} />
                            <Text style={styles.customColorLabel}>سفارشی</Text>
                          </Pressable>
                        </ScrollView>
                      ) : null}
                      {backgroundSubMenu === 'settings' ? (
                        <StudioSlider
                          value={blurRadius}
                          min={0}
                          max={50}
                          step={1}
                          onChange={setBlurRadius}
                          title="تاری پس‌زمینه"
                          caption="تصویر را واضح یا نرم کن"
                          valueLabel={blurRadius === 0 ? 'خاموش' : `${blurRadius} / ۵۰`}
                          colors={colors}
                          styles={styles}
                        />
                      ) : null}
                    </View>
                  ) : null}
                  {activeMenu === 'text' ? (
                    <View style={styles.panelStack}>
                      <SubMenuTabs
                        tabs={[
                          { value: 'color', label: 'رنگ' },
                          { value: 'font', label: 'فونت' },
                          { value: 'alignment', label: 'چینش' },
                        ]}
                        value={textSubMenu}
                        onChange={setTextSubMenu}
                        colors={colors}
                        styles={styles}
                      />
                      {textSubMenu === 'color' ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteOptions}>
                          {elegantPalette.map((color) => (
                            <Pressable
                              key={`text-${color}`}
                              testID={`postcard-text-color-${color}`}
                              accessibilityRole="button"
                              accessibilityLabel="انتخاب رنگ متن"
                              onPress={() => {
                                const next = hexToHsv(color);
                                setHue(next.hue);
                                setSaturation(next.saturation);
                                setBrightness(next.brightness);
                              }}
                              style={[styles.colorOption, { backgroundColor: color }]}
                            />
                          ))}
                          <Pressable
                            testID="postcard-text-custom-color"
                            accessibilityRole="button"
                            onPress={() => setPickerTarget('text')}
                            style={styles.customColorButton}
                          >
                            <Feather name="sliders" size={15} color={colors.primary} />
                            <Text style={styles.customColorLabel}>سفارشی</Text>
                          </Pressable>
                        </ScrollView>
                      ) : null}
                      {textSubMenu === 'font' ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.panelOptions}>
                          {fontOptions.map((font) => (
                            <Pressable
                              key={font.value}
                              testID={`postcard-font-${font.value}`}
                              accessibilityRole="button"
                              onPress={() => setFontChoice(font.value)}
                              style={[styles.fontOption, fontChoice === font.value && styles.optionSelected]}
                            >
                              <Text style={[styles.fontSample, getFontStyle(font.value)]}>{font.sample}</Text>
                              <Text style={styles.optionLabel}>{font.label}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : null}
                      {textSubMenu === 'alignment' ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.panelOptions}>
                          {(['right', 'center', 'left'] as TextAlignment[]).map((value) => (
                            <Pressable
                              key={value}
                              testID={`postcard-align-${value}`}
                              accessibilityRole="button"
                              onPress={() => setAlignment(value)}
                              style={[styles.alignOption, alignment === value && styles.optionSelected]}
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
                          ))}
                        </ScrollView>
                      ) : null}
                    </View>
                  ) : null}
                  {activeMenu === 'decorations' ? (
                    <View style={styles.panelStack}>
                      <Pressable
                        testID="postcard-upload-sticker"
                        accessibilityRole="button"
                        onPress={() => void pickCustomSticker()}
                        style={({ pressed }) => [styles.uploadStickerButton, pressed && styles.pressed]}
                      >
                        <Feather name="upload-cloud" size={18} color={colors.primaryForeground} />
                        <View style={styles.uploadStickerCopy}>
                          <Text style={styles.uploadStickerTitle}>افزودن استیکر سفارشی</Text>
                          <Text style={styles.uploadStickerCaption}>PNG یا آیکون از گالری</Text>
                        </View>
                        <Feather name="plus" size={18} color={colors.primaryForeground} />
                      </Pressable>
                      {customStickers.length ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stickerList}>
                          {customStickers.map((sticker, index) => (
                            <Pressable
                              key={sticker.id}
                              testID={`postcard-select-sticker-${index}`}
                              accessibilityRole="button"
                              accessibilityLabel="انتخاب استیکر"
                              onPress={() => setActiveStickerId(sticker.id)}
                              style={[styles.stickerThumbButton, activeStickerId === sticker.id && styles.optionSelected]}
                            >
                              <Image source={{ uri: sticker.uri }} style={styles.stickerThumb} resizeMode="contain" />
                              <Pressable
                                testID={`postcard-remove-sticker-${index}`}
                                accessibilityRole="button"
                                accessibilityLabel="حذف استیکر"
                                onPress={() => {
                                  setCustomStickers((current) => current.filter((item) => item.id !== sticker.id));
                                  setActiveStickerId((current) => (current === sticker.id ? null : current));
                                }}
                                style={styles.stickerRemoveBadge}
                              >
                                <Feather name="x" size={10} color={colors.primaryForeground} />
                              </Pressable>
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : (
                        <Text style={styles.emptyPanelText}>استیکر را روی بوم بکش و با pinch اندازه‌اش را تغییر بده.</Text>
                      )}
                      {activeStickerId ? (
                        (() => {
                          const activeSticker = customStickers.find((item) => item.id === activeStickerId);
                          if (!activeSticker) return null;
                          return (
                            <View style={styles.stickerAdjustments}>
                              <StudioSlider
                                value={activeSticker.opacity}
                                min={0.1}
                                max={1}
                                step={0.05}
                                onChange={(value) =>
                                  setCustomStickers((current) =>
                                    current.map((item) => (item.id === activeSticker.id ? { ...item, opacity: value } : item)),
                                  )
                                }
                                title="شفافیت"
                                caption="شدت دیده‌شدن استیکر"
                                valueLabel={`${Math.round(activeSticker.opacity * 100)}٪`}
                                colors={colors}
                                styles={styles}
                              />
                              <StudioSlider
                                value={activeSticker.borderRadius}
                                min={0}
                                max={100}
                                step={1}
                                onChange={(value) =>
                                  setCustomStickers((current) =>
                                    current.map((item) => (item.id === activeSticker.id ? { ...item, borderRadius: value } : item)),
                                  )
                                }
                                title="گردی گوشه‌ها"
                                caption="لبه‌های استیکر را نرم کن"
                                valueLabel={`${Math.round(activeSticker.borderRadius)}px`}
                                colors={colors}
                                styles={styles}
                              />
                            </View>
                          );
                        })()
                      ) : null}
                    </View>
                  ) : null}
                  {activeMenu === 'filters' ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.panelOptions}>
                      {filterOptions.map((filter) => {
                        const selected = activeFilters.includes(filter.value);
                        return (
                          <View
                            key={filter.value}
                            testID={`postcard-filter-${filter.value}`}
                            style={[styles.filterOption, selected && styles.optionSelected]}
                          >
                            <Feather name={filter.icon} size={16} color={selected ? colors.primary : colors.mutedForeground} />
                            <Text style={styles.optionLabel}>{filter.label}</Text>
                            <Switch
                              value={selected}
                              onValueChange={() => toggleFilter(filter.value)}
                              trackColor={{ false: colors.secondary, true: colors.accent }}
                              thumbColor={selected ? colors.primary : colors.mutedForeground}
                            />
                          </View>
                        );
                      })}
                    </ScrollView>
                  ) : null}
                </View>
              ) : null}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.menuTabs}
              >
                {menuOptions.map((menu) => (
                  <Pressable
                    key={menu.value}
                    testID={`postcard-menu-${menu.value}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activeMenu === menu.value }}
                    onPress={() => setActiveMenu(activeMenu === menu.value ? null : menu.value)}
                    style={[styles.menuTab, activeMenu === menu.value && styles.menuTabSelected]}
                  >
                    <Feather
                      name={menu.icon}
                      size={16}
                      color={activeMenu === menu.value ? colors.primary : colors.mutedForeground}
                    />
                    <Text style={[styles.menuTabLabel, activeMenu === menu.value && styles.menuTabLabelSelected]}>
                      {menu.label}
                    </Text>
                  </Pressable>
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
        <ColorWheelModal
          visible={pickerTarget !== null}
          title={pickerTarget === 'background' ? 'رنگ سفارشی پس‌زمینه' : 'رنگ سفارشی متن'}
          hue={hue}
          saturation={saturation}
          brightness={brightness}
          onHueChange={setHue}
          onSaturationChange={setSaturation}
          onBrightnessChange={setBrightness}
          onClose={() => setPickerTarget(null)}
          onApply={() => {
            if (pickerTarget === 'background') {
              setSolidBackground(hsvToHex(hue, saturation, brightness));
              setBackgroundKind('solid');
            }
            setPickerTarget(null);
          }}
          colors={colors}
          styles={styles}
        />
      </View>
    </Modal>
  );
}

function DraggableLyrics({
  title,
  artistName,
  lyrics,
  textColor,
  textStyle,
  alignment,
  width,
  top,
  styles,
}: {
  title: string;
  artistName?: string;
  lyrics: string;
  textColor: string;
  textStyle: { fontFamily: string; fontWeight?: '700' | '500' };
  alignment: TextAlignment;
  width: number;
  top: number;
  styles: ReturnType<typeof createStyles>;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));
  const gesture = Gesture.Simultaneous(
    Gesture.Pan()
      .minDistance(1)
      .shouldCancelWhenOutside(false)
      .onBegin(() => {
        startX.value = x.value;
        startY.value = y.value;
      })
      .onUpdate((event) => {
        x.value = startX.value + event.translationX;
        y.value = startY.value + event.translationY;
      }),
    Gesture.Pinch()
      .onStart(() => {
        startScale.value = scale.value;
      })
      .onUpdate((event) => {
        scale.value = Math.min(2.2, Math.max(0.62, startScale.value * event.scale));
      }),
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.textLayer, { width, top }, animatedStyle]}>
        <Text style={[styles.postcardTitle, textStyle, { color: textColor }]} numberOfLines={2}>
          {title}
        </Text>
        {artistName ? (
          <Text style={[styles.postcardArtist, textStyle, { color: textColor }]}>{artistName}</Text>
        ) : null}
        <View style={[styles.divider, { backgroundColor: textColor }]} />
        <Text style={[styles.poetryText, textStyle, { color: textColor, textAlign: alignment }]}>
          {lyrics.trim()}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

function DraggableSticker({
  uri,
  initialX,
  initialY,
  opacity,
  borderRadius,
  selected,
  onSelect,
  styles,
}: {
  uri: string;
  initialX: number;
  initialY: number;
  opacity: number;
  borderRadius: number;
  selected: boolean;
  onSelect: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const x = useSharedValue(initialX);
  const y = useSharedValue(initialY);
  const scale = useSharedValue(1);
  const startX = useSharedValue(initialX);
  const startY = useSharedValue(initialY);
  const startScale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));
  const gesture = Gesture.Simultaneous(
    Gesture.Pan()
      .minDistance(1)
      .shouldCancelWhenOutside(false)
      .onBegin(() => {
        startX.value = x.value;
        startY.value = y.value;
      })
      .onUpdate((event) => {
        x.value = startX.value + event.translationX;
        y.value = startY.value + event.translationY;
      }),
    Gesture.Pinch()
      .onStart(() => {
        startScale.value = scale.value;
      })
      .onUpdate((event) => {
        scale.value = Math.min(2.8, Math.max(0.35, startScale.value * event.scale));
      }),
  );

  const tapGesture = Gesture.Tap().onEnd((_event, success) => {
    if (success) runOnJS(onSelect)();
  });
  const composedGesture = Gesture.Simultaneous(gesture, tapGesture);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        testID="postcard-draggable-sticker"
        style={[
          styles.stickerLayer,
          { top: 0, left: '50%', opacity, borderRadius },
          selected && styles.stickerLayerSelected,
          animatedStyle,
        ]}
      >
        <Image
          source={{ uri }}
          style={[styles.customStickerImage, { borderRadius }]}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

function ChoiceOption({
  testID,
  label,
  caption,
  icon,
  selected,
  colors,
  styles,
  onPress,
}: {
  testID: string;
  label: string;
  caption: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  selected: boolean;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choiceOption, selected && styles.optionSelected]}
    >
      {icon ? <Feather name={icon} size={17} color={selected ? colors.primary : colors.mutedForeground} /> : null}
      <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text>
      <Text style={styles.choiceCaption}>{caption}</Text>
    </Pressable>
  );
}

function StudioSlider({
  value,
  min,
  max,
  step,
  onChange,
  title,
  caption,
  valueLabel,
  colors,
  styles,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  title: string;
  caption: string;
  valueLabel: string;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  const [trackWidth, setTrackWidth] = useState<number>(1);
  const position = useSharedValue((value - min) / Math.max(max - min, 1));
  const startPosition = useSharedValue((value - min) / Math.max(max - min, 1));
  useEffect(() => {
    position.value = (value - min) / Math.max(max - min, 1);
  }, [max, min, position, value]);
  const knobStyle = useAnimatedStyle(() => ({
    left: `${position.value * 100}%`,
  }));
  const gesture = Gesture.Pan()
    .onBegin((event) => {
      const next = Math.min(1, Math.max(0, event.x / Math.max(trackWidth, 1)));
      position.value = next;
      startPosition.value = next;
      runOnJS(onChange)(roundToStep(min + next * (max - min), step));
    })
    .onUpdate((event) => {
      const next = Math.min(1, Math.max(0, startPosition.value + event.translationX / Math.max(trackWidth, 1)));
      position.value = next;
      runOnJS(onChange)(roundToStep(min + next * (max - min), step));
    });

  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderValue}>{valueLabel}</Text>
      <View style={styles.sliderCopy}>
        <Text style={styles.sliderTitle}>{title}</Text>
        <Text style={styles.sliderCaption}>{caption}</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.sliderTrack}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        >
          <View style={[styles.sliderFill, { width: `${((value - min) / Math.max(max - min, 1)) * 100}%` }]} />
          <Animated.View style={[styles.sliderKnob, knobStyle, { backgroundColor: colors.primary }]} />
        </View>
      </GestureDetector>
    </View>
  );
}

function ColorPicker({
  hue,
  saturation,
  brightness,
  onHueChange,
  onSaturationChange,
  onBrightnessChange,
  colors,
  styles,
}: {
  hue: number;
  saturation: number;
  brightness: number;
  onHueChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
  onBrightnessChange: (value: number) => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  const [squareSize, setSquareSize] = useState<number>(1);
  const [hueWidth, setHueWidth] = useState<number>(1);
  const squareX = useSharedValue(saturation);
  const squareY = useSharedValue(1 - brightness);
  const huePosition = useSharedValue(hue / 360);
  useEffect(() => {
    squareX.value = saturation;
    squareY.value = 1 - brightness;
    huePosition.value = hue / 360;
  }, [brightness, hue, huePosition, saturation, squareX, squareY]);

  const cursorStyle = useAnimatedStyle(() => ({
    left: squareX.value * squareSize - 9,
    top: squareY.value * squareSize - 9,
  }));
  const hueCursorStyle = useAnimatedStyle(() => ({
    left: huePosition.value * hueWidth - 8,
  }));
  const hueColor = hsvToHex(hue, 1, 1);

  const squareGesture = Gesture.Pan()
    .onBegin((event) => {
      const x = Math.min(1, Math.max(0, event.x / Math.max(squareSize, 1)));
      const y = Math.min(1, Math.max(0, event.y / Math.max(squareSize, 1)));
      squareX.value = x;
      squareY.value = y;
      runOnJS(onSaturationChange)(x);
      runOnJS(onBrightnessChange)(1 - y);
    })
    .onChange((event) => {
      const x = Math.min(1, Math.max(0, event.x / Math.max(squareSize, 1)));
      const y = Math.min(1, Math.max(0, event.y / Math.max(squareSize, 1)));
      squareX.value = x;
      squareY.value = y;
      runOnJS(onSaturationChange)(x);
      runOnJS(onBrightnessChange)(1 - y);
    });
  const hueGesture = Gesture.Pan()
    .onBegin((event) => {
      const next = Math.min(1, Math.max(0, event.x / Math.max(hueWidth, 1)));
      huePosition.value = next;
      runOnJS(onHueChange)(next * 360);
    })
    .onChange((event) => {
      const next = Math.min(1, Math.max(0, huePosition.value + event.changeX / Math.max(hueWidth, 1)));
      huePosition.value = next;
      runOnJS(onHueChange)(next * 360);
    });

  return (
    <View style={styles.colorPicker}>
      <View style={styles.colorPickerHeader}>
        <View style={[styles.colorPreview, { backgroundColor: hsvToHex(hue, saturation, brightness) }]} />
        <View style={styles.colorPickerCopy}>
          <Text style={styles.colorPickerTitle}>رنگ کامل متن</Text>
          <Text style={styles.colorPickerCaption}>هر رنگی را با لمس و کشیدن انتخاب کن</Text>
        </View>
      </View>
      <GestureDetector gesture={squareGesture}>
        <View
          style={[styles.saturationSquare, { backgroundColor: hueColor }]}
          onLayout={(event) => setSquareSize(event.nativeEvent.layout.width)}
        >
          <LinearGradient colors={['#FFFFFF', 'rgba(255,255,255,0)']} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(0,0,0,0)', '#000000']} style={StyleSheet.absoluteFill} />
          <Animated.View style={[styles.colorCursor, cursorStyle, { borderColor: colors.foreground }]} />
        </View>
      </GestureDetector>
      <GestureDetector gesture={hueGesture}>
        <View style={styles.hueTrack} onLayout={(event) => setHueWidth(event.nativeEvent.layout.width)}>
          <LinearGradient colors={hueColors} style={StyleSheet.absoluteFill} />
          <Animated.View style={[styles.hueCursor, hueCursorStyle, { borderColor: colors.foreground }]} />
        </View>
      </GestureDetector>
    </View>
  );
}

function SubMenuTabs<T extends string>({
  tabs,
  value,
  onChange,
  colors,
  styles,
}: {
  tabs: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.subMenuTabs}
    >
      {tabs.map((tab) => (
        <Pressable
          key={tab.value}
          testID={`postcard-submenu-${tab.value}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === tab.value }}
          onPress={() => onChange(tab.value)}
          style={[styles.subMenuTab, value === tab.value && styles.subMenuTabSelected]}
        >
          <Text style={[styles.subMenuLabel, value === tab.value && { color: colors.primary }]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function ColorWheelModal({
  visible,
  title,
  hue,
  saturation,
  brightness,
  onHueChange,
  onSaturationChange,
  onBrightnessChange,
  onClose,
  onApply,
  colors,
  styles,
}: {
  visible: boolean;
  title: string;
  hue: number;
  saturation: number;
  brightness: number;
  onHueChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
  onBrightnessChange: (value: number) => void;
  onClose: () => void;
  onApply: () => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.colorModalBackdrop}>
        <View style={styles.colorModalCard}>
          <View style={styles.colorModalHeader}>
            <Pressable
              testID="postcard-color-wheel-close"
              accessibilityRole="button"
              accessibilityLabel="بستن انتخاب‌گر رنگ"
              onPress={onClose}
              style={styles.colorModalClose}
            >
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
            <Text style={styles.colorModalTitle}>{title}</Text>
          </View>
          <ColorPicker
            hue={hue}
            saturation={saturation}
            brightness={brightness}
            onHueChange={onHueChange}
            onSaturationChange={onSaturationChange}
            onBrightnessChange={onBrightnessChange}
            colors={colors}
            styles={styles}
          />
          <Pressable
            testID="postcard-color-wheel-apply"
            accessibilityRole="button"
            onPress={onApply}
            style={({ pressed }) => [styles.colorModalApply, pressed && styles.pressed]}
          >
            <Text style={styles.colorModalApplyText}>اعمال رنگ</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function getFontStyle(font: PersianFont) {
  return { fontFamily: `${font}_400Regular` };
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function hexToHsv(hex: string) {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation: max === 0 ? 0 : delta / max,
    brightness: max,
  };
}

function filterOverlayColor(filter: FilterName) {
  if (filter === 'grayscale') return 'rgba(34, 34, 34, 0.28)';
  if (filter === 'vintage') return 'rgba(166, 117, 66, 0.24)';
  if (filter === 'sepia') return 'rgba(112, 66, 20, 0.28)';
  if (filter === 'cool') return 'rgba(45, 105, 170, 0.2)';
  if (filter === 'warm') return 'rgba(218, 105, 31, 0.21)';
  if (filter === 'invert') return 'rgba(255, 255, 255, 0.34)';
  if (filter === 'noise') return 'rgba(255, 255, 255, 0.12)';
  return 'rgba(0, 0, 0, 0.3)';
}

function hsvToHex(hue: number, saturation: number, value: number) {
  const chroma = value * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] =
    segment < 1
      ? [chroma, x, 0]
      : segment < 2
        ? [x, chroma, 0]
        : segment < 3
          ? [0, chroma, x]
          : segment < 4
            ? [0, x, chroma]
            : segment < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const match = value - chroma;
  const channel = (component: number) => Math.round((component + match) * 255).toString(16).padStart(2, '0');
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
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
    editorContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 10 },
    canvasHintRow: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3 },
    canvasHint: { color: colors.mutedForeground, fontSize: 10, textAlign: 'right' },
    textAction: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
    textActionLabel: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    postcard: { position: 'relative', overflow: 'hidden', borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: withAlpha(colors.foreground, 0.18) },
    backgroundImage: { ...StyleSheet.absoluteFillObject, opacity: 0.92 },
    backgroundFallback: { ...StyleSheet.absoluteFillObject },
    filterOverlay: { ...StyleSheet.absoluteFillObject },
    canvasFrame: { ...StyleSheet.absoluteFillObject, padding: 13 },
    canvasContent: { flex: 1, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: withAlpha(colors.foreground, 0.22), borderRadius: 18 },
    watermark: { position: 'absolute', bottom: 17, alignSelf: 'center', zIndex: 1, color: withAlpha(colors.foreground, 0.72), fontSize: 11, fontWeight: '700', letterSpacing: 2 },
    textLayer: { position: 'absolute', left: 20, right: 20, alignItems: 'stretch', paddingVertical: 8, zIndex: 2 },
    postcardTitle: { fontSize: 23, lineHeight: 31, fontWeight: '700', textAlign: 'center' },
    postcardArtist: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 6 },
    divider: { width: 42, height: 2, borderRadius: 2, alignSelf: 'center', marginVertical: 16 },
    poetryText: { fontSize: 18, lineHeight: 34, writingDirection: 'rtl' },
    stickerLayer: { position: 'absolute', width: 78, height: 78, marginLeft: -39, zIndex: 3, overflow: 'hidden' },
    stickerLayerSelected: { borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed' },
    customStickerImage: { width: '100%', height: '100%' },
    menuShell: { width: '100%', borderRadius: 19, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    contextPanel: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    panelStack: { gap: 10 },
    panelOptions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 10 },
    subMenuTabs: { flexDirection: 'row-reverse', gap: 5, paddingHorizontal: 10, paddingBottom: 2 },
    subMenuTab: { minWidth: 68, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 10 },
    subMenuTabSelected: { backgroundColor: colors.accent },
    subMenuLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600' },
    choiceOption: { minWidth: 80, minHeight: 57, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 12, paddingHorizontal: 9 },
    choiceLabel: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
    choiceLabelSelected: { color: colors.primary },
    choiceCaption: { color: colors.mutedForeground, fontSize: 9 },
    menuTabs: { flexDirection: 'row-reverse', gap: 5, paddingHorizontal: 7, paddingVertical: 7 },
    menuTab: { minWidth: 68, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 13 },
    menuTabSelected: { backgroundColor: colors.accent },
    menuTabLabel: { color: colors.mutedForeground, fontSize: 10, fontWeight: '600' },
    menuTabLabelSelected: { color: colors.foreground, fontWeight: '700' },
    optionSelected: { backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.primary },
    colorOption: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: colors.border, marginHorizontal: 4 },
    colorOptionSelected: { borderWidth: 3, borderColor: colors.primary },
    paletteOptions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12 },
    customColorButton: { minWidth: 68, height: 38, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.accent },
    customColorLabel: { color: colors.primary, fontSize: 10, fontWeight: '700' },
    dimensionEditor: { paddingHorizontal: 12, gap: 7 },
    dimensionTitle: { color: colors.foreground, fontSize: 11, fontWeight: '700', textAlign: 'right' },
    dimensionInputs: { flexDirection: 'row-reverse', gap: 8 },
    dimensionInput: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground, paddingHorizontal: 12, textAlign: 'right', fontSize: 13 },
    dimensionCaption: { color: colors.mutedForeground, fontSize: 9, textAlign: 'right' },
    sliderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
    sliderCopy: { minWidth: 95, alignItems: 'flex-end' },
    sliderTitle: { color: colors.foreground, fontSize: 11, fontWeight: '700', textAlign: 'right' },
    sliderCaption: { color: colors.mutedForeground, fontSize: 9, textAlign: 'right', marginTop: 2 },
    sliderValue: { minWidth: 44, color: colors.primary, fontSize: 10, fontWeight: '700', textAlign: 'center' },
    sliderTrack: { flex: 1, height: 25, justifyContent: 'center', position: 'relative', borderRadius: 12 },
    sliderFill: { position: 'absolute', left: 0, height: 5, borderRadius: 5, backgroundColor: colors.primary },
    sliderKnob: { position: 'absolute', top: 5, width: 15, height: 15, borderRadius: 8, marginLeft: -7, borderWidth: 2, borderColor: colors.primaryForeground },
    colorPicker: { paddingHorizontal: 12, gap: 8 },
    colorPickerHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
    colorPreview: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border },
    colorPickerCopy: { flex: 1, alignItems: 'flex-end' },
    colorPickerTitle: { color: colors.foreground, fontSize: 11, fontWeight: '700', textAlign: 'right' },
    colorPickerCaption: { color: colors.mutedForeground, fontSize: 9, textAlign: 'right', marginTop: 2 },
    saturationSquare: { width: '100%', height: 128, borderRadius: 13, overflow: 'hidden', position: 'relative' },
    colorCursor: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2, backgroundColor: 'transparent' },
    hueTrack: { width: '100%', height: 18, borderRadius: 9, overflow: 'hidden', position: 'relative' },
    hueCursor: { position: 'absolute', top: -2, width: 22, height: 22, borderRadius: 11, borderWidth: 2, backgroundColor: 'transparent' },
    fontOption: { minWidth: 78, minHeight: 51, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 11, paddingHorizontal: 7 },
    fontSample: { color: colors.foreground, fontSize: 17 },
    optionLabel: { color: colors.mutedForeground, fontSize: 10, textAlign: 'center' },
    alignOption: { minWidth: 55, minHeight: 51, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 11, paddingHorizontal: 7 },
    uploadStickerButton: { marginHorizontal: 10, minHeight: 56, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.primary },
    uploadStickerCopy: { flex: 1, alignItems: 'flex-end' },
    uploadStickerTitle: { color: colors.primaryForeground, fontSize: 12, fontWeight: '700', textAlign: 'right' },
    uploadStickerCaption: { color: withAlpha(colors.primaryForeground, 0.72), fontSize: 9, textAlign: 'right', marginTop: 2 },
    stickerList: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 10, paddingTop: 2 },
    stickerThumbButton: { width: 58, height: 58, borderRadius: 12, padding: 5, backgroundColor: colors.secondary, position: 'relative' },
    stickerThumb: { width: '100%', height: '100%' },
    stickerRemoveBadge: { position: 'absolute', top: -4, left: -4, width: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.destructive },
    stickerAdjustments: { gap: 8, paddingTop: 3 },
    emptyPanelText: { color: colors.mutedForeground, fontSize: 10, textAlign: 'right', paddingHorizontal: 12 },
    filterOption: { minWidth: 105, minHeight: 54, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 7 },
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
    colorModalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.72)' },
    colorModalCard: { width: '100%', maxWidth: 390, gap: 14, padding: 16, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    colorModalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    colorModalTitle: { flex: 1, color: colors.foreground, fontSize: 16, fontWeight: '700', textAlign: 'right' },
    colorModalClose: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.secondary },
    colorModalApply: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.primary },
    colorModalApplyText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
    pressed: { opacity: 0.74 },
  });
}