import { Feather } from '@expo/vector-icons';
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
  Text,
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
import ViewShot from 'react-native-view-shot';
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
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const toastProgress = useSharedValue(0);
  const postcardWidth = Math.min(Math.max(width - 40, 280), 360);

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastProgress.value,
    transform: [{ translateY: (1 - toastProgress.value) * 18 }],
  }));

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

  const savePostcard = async () => {
    if (saving) return;
    if (Platform.OS === 'web') {
      showToast('ذخیره در گالری روی نسخه‌ی وب در دسترس نیست.');
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
      const uri = await shotRef.current?.capture?.();
      if (!uri) {
        showToast('ساخت عکس‌نوشته انجام نشد.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      showToast('عکس‌نوشته در گالری ذخیره شد.');
    } catch {
      showToast('ذخیره‌ی عکس‌نوشته انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>استودیو شعر</Text>
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

        <ScrollView
           contentContainerStyle={[
             styles.content,
             { paddingBottom: insets.bottom + 34 },
           ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={postcardWidth * 1.25 + 180 > 700}
        >
          <ViewShot
            ref={shotRef}
            options={{ format: 'jpg', quality: 0.94, result: 'tmpfile' }}
            style={[styles.postcard, { width: postcardWidth, height: postcardWidth * 1.25 }]}
          >
            {coverImage ? (
              <Image
                source={{ uri: coverImage }}
                style={styles.backgroundImage}
                blurRadius={50}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.backgroundFallback} />
            )}
            <LinearGradient
              pointerEvents="none"
              colors={[
                withAlpha(colors.background, 0.12),
                withAlpha(colors.background, 0.58),
                withAlpha(colors.background, 0.94),
              ]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.postcardFrame}>
              <View style={styles.postcardMeta}>
                <Text style={styles.postcardKicker}>نغمه / یادداشت شخصی</Text>
                <Feather name="music" size={16} color={colors.primary} />
              </View>
              <View style={styles.poetryBlock}>
                <Text style={styles.postcardTitle} numberOfLines={2}>{title}</Text>
                {artistName ? <Text style={styles.postcardArtist}>{artistName}</Text> : null}
                <View style={styles.divider} />
                <Text style={styles.poetryText}>{lyrics}</Text>
              </View>
              <Text style={styles.watermark}>Naghme</Text>
            </View>
          </ViewShot>

          <View style={styles.helperCard}>
            <Feather name="image" size={18} color={colors.primary} />
            <Text style={styles.helperText}>
              این قاب با کاور قطعه و متن کامل شعر ساخته می‌شود.
            </Text>
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

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 15,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerCopy: { flex: 1, alignItems: 'flex-end' },
    eyebrow: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right', marginBottom: 4 },
    headerTitle: { color: colors.foreground, fontSize: 21, fontWeight: '700', textAlign: 'right' },
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
    content: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 34,
      gap: 16,
    },
    postcard: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 26,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: withAlpha(colors.foreground, 0.18),
    },
    backgroundImage: { ...StyleSheet.absoluteFillObject, opacity: 0.9 },
    backgroundFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.card },
    postcardFrame: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 27,
    },
    postcardMeta: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    postcardKicker: {
      color: withAlpha(colors.foreground, 0.72),
      fontSize: 10,
      letterSpacing: 0.6,
      textAlign: 'right',
    },
    poetryBlock: { alignItems: 'center', paddingVertical: 20 },
    postcardTitle: {
      color: colors.foreground,
      fontSize: 25,
      lineHeight: 34,
      fontWeight: '700',
      textAlign: 'center',
    },
    postcardArtist: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 7,
    },
    divider: {
      width: 44,
      height: 2,
      borderRadius: 2,
      backgroundColor: colors.primary,
      marginVertical: 19,
    },
    poetryText: {
      color: colors.foreground,
      fontSize: 18,
      lineHeight: 34,
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    watermark: {
      color: withAlpha(colors.foreground, 0.66),
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 2,
      textAlign: 'center',
    },
    helperCard: {
      width: '100%',
      minHeight: 48,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 14,
      borderRadius: 15,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    helperText: { flex: 1, color: colors.mutedForeground, fontSize: 12, lineHeight: 20, textAlign: 'right' },
    saveButton: {
      width: '100%',
      minHeight: 52,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      borderRadius: 16,
      backgroundColor: colors.primary,
    },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '700' },
    toast: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 24,
      minHeight: 48,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primary,
      shadowColor: colors.background,
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    toastText: { color: colors.foreground, fontSize: 12, fontWeight: '600', textAlign: 'right' },
    pressed: { opacity: 0.74 },
  });
}