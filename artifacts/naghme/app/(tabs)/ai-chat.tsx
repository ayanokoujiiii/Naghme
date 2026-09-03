import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { MINI_PLAYER_CONTENT_PADDING, useMiniPlayerActive } from '@/hooks/useMiniPlayerActive';
import {
  askGeminiChat,
  GeminiChatMessage,
  getGeminiApiKey,
  getGeminiModel,
} from '@/src/ai/gemini';
import { getChatArchiveContext } from '@/src/db/queries';

type ChatMessage = GeminiChatMessage & { id: string };

const initialMessage: ChatMessage = {
  id: 'naghme-welcome',
  role: 'model',
  text: 'من نغمه‌ام. درباره‌ی قطعه‌ها، خاطره‌هایی که با موسیقی ساخته‌ای و حال‌وهوای آرشیوت با من حرف بزن.',
};

export default function AiChatScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const miniPlayerActive = useMiniPlayerActive();
  const inputRef = useRef<TextInput>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const sendMessage = async () => {
    const cleanMessage = input.trim();
    if (!cleanMessage || sending) return;

    const userMessage: ChatMessage = {
      id: createMessageId('user'),
      role: 'user',
      text: cleanMessage,
    };
    const conversation = messages.map(({ role, text }) => ({ role, text }));
    setMessages((currentMessages) => [userMessage, ...currentMessages]);
    setInput('');
    setError('');
    setSending(true);

    try {
      const [apiKey, model, archiveContext] = await Promise.all([
        getGeminiApiKey(),
        getGeminiModel(),
        getChatArchiveContext(),
      ]);
      if (!apiKey) {
        throw new Error('برای شروع گفتگو، کلید Gemini را در تنظیمات ذخیره کن.');
      }

      const response = await askGeminiChat(
        apiKey,
        cleanMessage,
        JSON.stringify(archiveContext),
        conversation,
        model,
      );
      setMessages((currentMessages) => [
        { id: createMessageId('model'), role: 'model', text: response },
        ...currentMessages,
      ]);
    } catch (sendError: unknown) {
      setError(sendError instanceof Error ? sendError.message : 'گفتگو انجام نشد.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const tabBarHeight = Platform.OS === 'web' ? 84 : 78;
  const composerBottomPadding =
    insets.bottom + tabBarHeight + (miniPlayerActive ? MINI_PLAYER_CONTENT_PADDING : 12);
  const listBottomPadding = composerBottomPadding + 74;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>آرشیو شخصی تو، با صدای خودش</Text>
          <Text style={styles.title}>گفتگو</Text>
        </View>
        <View style={styles.headerIcon}>
          <Feather name="message-circle" size={22} color={colors.primary} />
        </View>
      </View>

      <FlatList
        inverted
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={({ item }) => <ChatBubble message={item} colors={colors} styles={styles} />}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.messages, { paddingBottom: listBottomPadding }]}
        ListHeaderComponent={
          sending ? (
            <View style={styles.typingRow}>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.typingText}>نغمه در حال گوش‌دادن به آرشیوت است…</Text>
              </View>
            </View>
          ) : null
        }
      />

      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={16} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
          {!getErrorNeedsSettings(error) ? null : (
            <Pressable
              testID="chat-open-settings"
              accessibilityRole="button"
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
            >
              <Text style={styles.settingsButtonText}>تنظیمات</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <View style={[styles.composerArea, { paddingBottom: composerBottomPadding }]}>
        <View style={styles.composer}>
          <Pressable
            testID="chat-send"
            accessibilityRole="button"
            accessibilityLabel="ارسال پیام"
            disabled={!input.trim() || sending}
            onPress={() => void sendMessage()}
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || sending) && styles.sendButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Feather name="arrow-up" size={19} color={colors.primaryForeground} />
            )}
          </Pressable>
          <TextInput
            ref={inputRef}
            testID="chat-input"
            value={input}
            onChangeText={setInput}
            placeholder="از آرشیوت بپرس…"
            placeholderTextColor={colors.mutedForeground}
            selectionColor={colors.primary}
            style={styles.input}
            textAlign="right"
            multiline
            maxLength={1000}
            onSubmitEditing={() => void sendMessage()}
            blurOnSubmit={false}
          />
        </View>
        <Text style={styles.privacyHint}>زمینه‌ی گفتگو فقط از آرشیو همین دستگاه ساخته می‌شود.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function ChatBubble({
  message,
  colors,
  styles,
}: {
  message: ChatMessage;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.userBubbleRow : styles.modelBubbleRow]}>
      {!isUser ? (
        <View style={styles.modelIcon}>
          <Feather name="music" size={14} color={colors.primaryForeground} />
        </View>
      ) : null}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.modelBubble]}>
        <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{message.text}</Text>
      </View>
    </View>
  );
}

function createMessageId(role: ChatMessage['role']): string {
  return `${role}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getErrorNeedsSettings(value: string): boolean {
  return value.includes('تنظیمات') || value.includes('کلید Gemini');
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 16,
    },
    headerCopy: { flex: 1, alignItems: 'flex-end' },
    eyebrow: { color: colors.mutedForeground, fontSize: 12, textAlign: 'right', marginBottom: 4 },
    title: { color: colors.foreground, fontSize: 32, lineHeight: 39, fontWeight: '700', textAlign: 'right' },
    headerIcon: {
      width: 48,
      height: 48,
      borderRadius: 17,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    messages: { paddingHorizontal: 18, gap: 12 },
    bubbleRow: { width: '100%', flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8 },
    userBubbleRow: { justifyContent: 'flex-start' },
    modelBubbleRow: { justifyContent: 'flex-end' },
    modelIcon: {
      width: 28,
      height: 28,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 3,
    },
    bubble: {
      maxWidth: '82%',
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderRadius: 19,
      borderWidth: 1,
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      borderBottomLeftRadius: 6,
    },
    modelBubble: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderBottomRightRadius: 6,
    },
    bubbleText: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 24,
      textAlign: 'right',
    },
    userBubbleText: { color: colors.primaryForeground },
    typingRow: { width: '100%', alignItems: 'flex-end', paddingBottom: 4 },
    typingBubble: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 13,
      paddingVertical: 10,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typingText: { color: colors.mutedForeground, fontSize: 11 },
    composerArea: {
      paddingHorizontal: 16,
      paddingTop: 8,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    composer: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 9,
      padding: 6,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.card,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 110,
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 22,
      paddingHorizontal: 9,
      paddingTop: 9,
      paddingBottom: 7,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: { opacity: 0.42 },
    privacyHint: {
      color: colors.mutedForeground,
      fontSize: 10,
      textAlign: 'center',
      marginTop: 7,
    },
    errorBox: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 7,
      marginHorizontal: 16,
      marginBottom: 4,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 13,
      backgroundColor: colors.muted,
    },
    errorText: { flex: 1, color: colors.destructive, fontSize: 11, lineHeight: 18, textAlign: 'right' },
    settingsButton: {
      minHeight: 30,
      paddingHorizontal: 9,
      borderRadius: 9,
      backgroundColor: colors.secondary,
      justifyContent: 'center',
    },
    settingsButtonText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    pressed: { opacity: 0.72 },
  });
}