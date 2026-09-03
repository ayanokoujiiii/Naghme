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
type CanvasRatio = 'square' | 'portrait' | 'landscape' | 'story';
type PersianFont =
  | 'IranNastaliq'
  | 'Thuluth'
  | 'Lalezar'
  | 'Titr'
  | 'Vazirmatn';

interface CustomSticker {
  id: string;
  uri: string;
}

const ratioOptions: Array<{ value: CanvasRatio; label: string; caption: string; ratio: number }> = [
  { value: 'square', label: '۱:۱', caption: 'مربع', ratio: 1 },
  { value: 'portrait', label: '۴:۵', caption: 'پرتره', ratio: 0.8 },
  { value: 'landscape', label: '۱۶:۹', caption: 'افقی', ratio: 16 / 9 },
  { value: 'story', label: '۹:۱۶', caption: 'استوری', ratio: 9 / 16 },
];

const fontOptions: Array<{ value: PersianFont; label: string; sample: string }> = [
  { value: 'IranNastaliq', label: 'ایران نستعلیق', sample: 'نستعلیق' },
  { value: 'Thuluth', label: 'ثلث', sample: 'غزل' },
  { value: 'Lalezar', label: 'لاله‌زار', sample: 'نغمه' },
  { value: 'Titr', label: 'تیتر', sample: 'آواز' },
  { value: 'Vazirmatn', label: 'وزیر', sample: 'شعر' },
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
  const [ratio, setRatio] = useState<CanvasRatio>('portrait');
  const [activeMenu, setActiveMenu] = useState<StudioMenu>(null);
  const [backgroundKind, setBackgroundKind] = useState<BackgroundKind>('cover');
  const [customBackgroundUri, setCustomBackgroundUri] = useState<string | null>(null);
  const [solidBackground, setSolidBackground] = useState<string>(colors.card);
  const [blurRadius, setBlurRadius] = useState<number>(28);
  const [fontChoice, setFontChoice] = useState<PersianFont>('IranNastaliq');
  const [alignment, setAlignment] = useState<TextAlignment>('center');
  const [hue, setHue] = useState<number>(30);
  const [saturation, setSaturation] = useState<number>(0.42);
  const [brightness, setBrightness] = useState<number>(0.96);
  const [customStickers, setCustomStickers] = useState<CustomSticker[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterName[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('jpg');
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const toastProgress = useSharedValue(0);
  const postcardWidth = Math.min(Math.max(width - 32, 280), 360);
  const selectedRatio = ratioOptions.find((item) => item.value === ratio) ?? ratioOptions[1];
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
    setActiveMenu(null);
    setBackgroundKind('cover');
    setCustomBackgroundUri(null);
    setBlurRadius(28);
    setFontChoice('IranNastaliq');
    setAlignment('center');
    setHue(30);
    setSaturation(0.42);
    setBrightness(0.96);
    setCustomStickers([]);
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
        { id: `${Date.now()}-${current.length}`, uri },
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

            <ViewShot
              ref={shotRef}
              options={{ result: 'tmpfile' }}
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
                      styles={styles}
                    />
                  ))}
                </View>
              </View>
            </ViewShot>

            <View style={styles.menuShell}>
              {activeMenu ? (
                <View style={styles.contextPanel}>
                  {activeMenu === 'ratio' ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.panelOptions}>
                      {ratioOptions.map((option) => (
                        <ChoiceOption
                          key={option.value}
                          testID={`postcard-ratio-${option.value}`}
                          label={option.label}
                          caption={option.caption}
                          selected={ratio === option.value}
                          colors={colors}
                          styles={styles}
                          onPress={() => setRatio(option.value)}
                        />
                      ))}
                    </ScrollView>
                  ) : null}
                  {activeMenu === 'background' ? (
                    <View style={styles.panelStack}>
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
                        {solidColors.map((color) => (
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
                      </ScrollView>
                      {backgroundKind !== 'solid' ? (
                        <BlurSlider value={blurRadius} onChange={setBlurRadius} colors={colors} styles={styles} />
                      ) : null}
                    </View>
                  ) : null}
                  {activeMenu === 'text' ? (
                    <View style={styles.panelStack}>
                      <ColorPicker
                        hue={hue}
                        saturation={saturation}
                        brightness={brightness}
                        onHueChange={setHue}
                        onSaturationChange={setSaturation}
                        onBrightnessChange={setBrightness}
                        colors={colors}
                        styles={styles}
                      />
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
                              testID={`postcard-remove-sticker-${index}`}
                              accessibilityRole="button"
                              accessibilityLabel="حذف استیکر"
                              onPress={() => setCustomStickers((current) => current.filter((item) => item.id !== sticker.id))}
                              style={styles.stickerThumbButton}
                            >
                              <Image source={{ uri: sticker.uri }} style={styles.stickerThumb} resizeMode="contain" />
                              <View style={styles.stickerRemoveBadge}>
                                <Feather name="x" size={10} color={colors.primaryForeground} />
                              </View>
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : (
                        <Text style={styles.emptyPanelText}>استیکر را روی بوم بکش و با pinch اندازه‌اش را تغییر بده.</Text>
                      )}
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
  const startScale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));
  const gesture = Gesture.Simultaneous(
    Gesture.Pan().onChange((event) => {
      x.value += event.changeX;
      y.value += event.changeY;
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
        <Text style={[styles.postcardTitle, { color: textColor }]} numberOfLines={2}>
          {title}
        </Text>
        {artistName ? (
          <Text style={[styles.postcardArtist, { color: textColor }]}>{artistName}</Text>
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
  styles,
}: {
  uri: string;
  initialX: number;
  initialY: number;
  styles: ReturnType<typeof createStyles>;
}) {
  const x = useSharedValue(initialX);
  const y = useSharedValue(initialY);
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));
  const gesture = Gesture.Simultaneous(
    Gesture.Pan().onChange((event) => {
      x.value += event.changeX;
      y.value += event.changeY;
    }),
    Gesture.Pinch()
      .onStart(() => {
        startScale.value = scale.value;
      })
      .onUpdate((event) => {
        scale.value = Math.min(2.8, Math.max(0.35, startScale.value * event.scale));
      }),
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.stickerLayer, { top: 0, left: '50%' }, animatedStyle]}>
        <Image source={{ uri }} style={styles.customStickerImage} resizeMode="contain" />
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

function BlurSlider({
  value,
  onChange,
  colors,
  styles,
}: {
  value: number;
  onChange: (value: number) => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  const [trackWidth, setTrackWidth] = useState<number>(1);
  const position = useSharedValue(value / 50);
  useEffect(() => {
    position.value = value / 50;
  }, [position, value]);
  const knobStyle = useAnimatedStyle(() => ({
    left: `${position.value * 100}%`,
  }));
  const gesture = Gesture.Pan()
    .onBegin((event) => {
      const next = Math.min(1, Math.max(0, event.x / Math.max(trackWidth, 1)));
      position.value = next;
      runOnJS(onChange)(Math.round(next * 50));
    })
    .onChange((event) => {
      const next = Math.min(1, Math.max(0, position.value + event.changeX / Math.max(trackWidth, 1)));
      position.value = next;
      runOnJS(onChange)(Math.round(next * 50));
    });

  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderValue}>{value === 0 ? 'خاموش' : `${value} / ۵۰`}</Text>
      <View style={styles.sliderCopy}>
        <Text style={styles.sliderTitle}>تاری پس‌زمینه</Text>
        <Text style={styles.sliderCaption}>تصویر سفارشی را واضح یا نرم کن</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.sliderTrack}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        >
          <View style={[styles.sliderFill, { width: `${value * 2}%` }]} />
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

function getFontStyle(font: PersianFont) {
  if (font === 'IranNastaliq') return { fontFamily: 'IranNastaliq' };
  if (font === 'Thuluth') return { fontFamily: 'Thuluth' };
  if (font === 'Lalezar') return { fontFamily: 'Lalezar', fontWeight: '700' as const };
  if (font === 'Titr') return { fontFamily: 'Titr', fontWeight: '700' as const };
  return { fontFamily: 'Vazirmatn' };
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
    stickerLayer: { position: 'absolute', width: 78, height: 78, marginLeft: -39, zIndex: 3 },
    customStickerImage: { width: '100%', height: '100%' },
    menuShell: { width: '100%', borderRadius: 19, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    contextPanel: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    panelStack: { gap: 10 },
    panelOptions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 10 },
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
    pressed: { opacity: 0.74 },
  });
}