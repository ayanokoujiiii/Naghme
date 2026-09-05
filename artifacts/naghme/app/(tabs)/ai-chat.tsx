import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { askGeminiChat, GeminiChatMessage, getGeminiApiKey, getGeminiModel } from '@/src/ai/gemini';
import {
  appendConversationMessage,
  ConversationRecord,
  createConversation,
  deleteConversation,
  getConversationMessages,
  getConversations,
  getLatestConversation,
  getChatArchiveContext,
  renameConversation,
} from '@/src/db/queries';

type ChatMessage = GeminiChatMessage & { id: string };
const GEMINI_CONTEXT_MESSAGE_LIMIT = 20;
const welcome: ChatMessage = { id: 'naghme-welcome', role: 'model', text: 'من نغمه‌ام. درباره‌ی قطعه‌ها، خاطره‌هایی که با موسیقی ساخته‌ای و حال‌وهوای آرشیوت با من حرف بزن.' };

export default function AiChatScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const miniPlayerActive = useMiniPlayerActive();
  const inputRef = useRef<TextInput>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ConversationRecord[]>([]);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const loadConversation = async (record: ConversationRecord | null) => {
    if (!record) {
      setConversationId(null);
      setMessages([welcome]);
      return;
    }
    const saved = await getConversationMessages(record.id);
    setConversationId(record.id);
    setMessages(saved.map((message) => ({ id: message.id, role: message.role, text: message.text })));
  };

  useEffect(() => {
    void (async () => {
      try {
        await loadConversation(await getLatestConversation());
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'بارگذاری گفتگو انجام نشد.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openHistory = async () => {
    try {
      setHistory(await getConversations());
      setHistoryOpen(true);
    } catch (historyError: unknown) {
      setError(historyError instanceof Error ? historyError.message : 'تاریخچه بارگذاری نشد.');
    }
  };

  const newConversation = () => {
    if (sending) return;
    setConversationId(null);
    setMessages([welcome]);
    setError('');
    setHistoryOpen(false);
  };

  const sendMessage = async () => {
    const cleanMessage = input.trim();
    if (!cleanMessage || sending) return;
    const userMessage: ChatMessage = { id: createMessageId('user'), role: 'user', text: cleanMessage };
    // Capture saved history before adding the new user turn.
    const prior = messages
      .filter((message) => message.id !== welcome.id)
      .slice(-GEMINI_CONTEXT_MESSAGE_LIMIT)
      .map(({ role, text }) => ({ role, text }));
    setMessages((current) => [...current.filter((message) => message.id !== welcome.id), userMessage]);
    setInput('');
    setError('');
    setSending(true);
    try {
      let activeId = conversationId;
      if (!activeId) {
        const created = await createConversation(cleanMessage);
        activeId = created.id;
        setConversationId(activeId);
      } else {
        await appendConversationMessage(activeId, 'user', cleanMessage);
      }
      const [apiKey, model, archiveContext] = await Promise.all([getGeminiApiKey(), getGeminiModel(), getChatArchiveContext()]);
      if (!apiKey) throw new Error('برای شروع گفتگو، کلید Gemini را در تنظیمات ذخیره کن.');
      const response = await askGeminiChat(apiKey, cleanMessage, JSON.stringify(archiveContext), prior, model);
      const assistantMessage: ChatMessage = { id: createMessageId('model'), role: 'model', text: response };
      setMessages((current) => [...current, assistantMessage]);
      await appendConversationMessage(activeId, 'model', response);
    } catch (sendError: unknown) {
      setError(sendError instanceof Error ? sendError.message : 'گفتگو انجام نشد.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const deleteItem = (record: ConversationRecord) => {
    Alert.alert('حذف گفتگو', `«${record.title}» حذف شود؟`, [
      { text: 'لغو', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => void (async () => {
        try {
          await deleteConversation(record.id);
          const next = await getConversations();
          setHistory(next);
          if (conversationId === record.id) await loadConversation(next[0] ?? null);
        } catch (deleteError: unknown) {
          setError(deleteError instanceof Error ? deleteError.message : 'حذف گفتگو انجام نشد.');
        }
      })() },
    ]);
  };

  const saveRename = async () => {
    if (!renameId || !renameText.trim()) return;
    try {
      await renameConversation(renameId, renameText);
      setHistory(await getConversations());
      setRenameId(null);
    } catch (renameError: unknown) {
      setError(renameError instanceof Error ? renameError.message : 'تغییر نام انجام نشد.');
    }
  };

  const tabBarHeight = Platform.OS === 'web' ? 84 : 78;
  const composerBottomPadding = insets.bottom + tabBarHeight + (miniPlayerActive ? MINI_PLAYER_CONTENT_PADDING : 12);
  const listBottomPadding = composerBottomPadding + 74;
  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerCopy}><Text style={styles.eyebrow}>آرشیو شخصی تو، با صدای خودش</Text><Text style={styles.title}>گفتگو</Text></View>
        <View style={styles.headerActions}>
          <Pressable testID="chat-new-conversation" accessibilityRole="button" onPress={newConversation} style={styles.iconButton}><Feather name="plus" size={20} color={colors.primary} /></Pressable>
          <Pressable testID="chat-history" accessibilityRole="button" onPress={() => void openHistory()} style={styles.iconButton}><Feather name="clock" size={20} color={colors.primary} /></Pressable>
        </View>
      </View>
      <FlatList
        inverted data={[...messages].reverse()} keyExtractor={(message) => message.id}
        renderItem={({ item }) => <ChatBubble message={item} colors={colors} styles={styles} />}
        showsVerticalScrollIndicator={false} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.messages, { paddingBottom: listBottomPadding }]}
        ListHeaderComponent={sending ? <View style={styles.typingRow}><View style={styles.typingBubble}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.typingText}>نغمه در حال گوش‌دادن به آرشیوت است…</Text></View></View> : null}
      />
      {loading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}
      {error ? <View style={styles.errorBox}><Feather name="alert-circle" size={16} color={colors.destructive} /><Text style={styles.errorText}>{error}</Text>{getErrorNeedsSettings(error) ? <Pressable testID="chat-open-settings" onPress={() => router.push('/settings')}><Text style={styles.settingsButtonText}>تنظیمات</Text></Pressable> : null}</View> : null}
      <View style={[styles.composerArea, { paddingBottom: composerBottomPadding }]}>
        <View style={styles.composer}>
          <Pressable testID="chat-send" accessibilityRole="button" disabled={!input.trim() || sending} onPress={() => void sendMessage()} style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}>{sending ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Feather name="arrow-up" size={19} color={colors.primaryForeground} />}</Pressable>
          <TextInput ref={inputRef} testID="chat-input" value={input} onChangeText={setInput} placeholder="از آرشیوت بپرس…" placeholderTextColor={colors.mutedForeground} selectionColor={colors.primary} style={styles.input} textAlign="right" multiline maxLength={1000} onSubmitEditing={() => void sendMessage()} blurOnSubmit={false} />
        </View>
        <Text style={styles.privacyHint}>متن گفتگو برای پاسخ‌گویی به یک سرویس خارجی (Gemini) ارسال می‌شود.</Text>
      </View>
      <Modal visible={historyOpen} animationType="slide" transparent onRequestClose={() => setHistoryOpen(false)}>
        <View style={styles.modalBackdrop}><View style={[styles.historyCard, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.historyHeader}><Text style={styles.historyTitle}>گفتگوهای قبلی</Text><Pressable testID="chat-history-close" onPress={() => setHistoryOpen(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable></View>
          <FlatList data={history} keyExtractor={(item) => item.id} ListEmptyComponent={<Text style={styles.emptyHistory}>هنوز گفتگویی ذخیره نشده است.</Text>} renderItem={({ item }) => <View style={styles.historyItem}><Pressable testID={`chat-history-open-${item.id}`} style={styles.historyOpen} onPress={() => void (async () => { await loadConversation(item); setHistoryOpen(false); })()}><Text style={styles.historyText}>{item.title}</Text><Text style={styles.historyMeta}>{item.messageCount} پیام</Text></Pressable><Pressable testID={`chat-history-rename-${item.id}`} onPress={() => { setRenameId(item.id); setRenameText(item.title); }}><Feather name="edit-2" size={17} color={colors.primary} /></Pressable><Pressable testID={`chat-history-delete-${item.id}`} onPress={() => deleteItem(item)}><Feather name="trash-2" size={17} color={colors.destructive} /></Pressable></View>} />
          {renameId ? <View style={styles.renameRow}><TextInput testID="chat-history-rename-input" value={renameText} onChangeText={setRenameText} style={styles.renameInput} textAlign="right" /><Pressable testID="chat-history-rename-save" onPress={() => void saveRename()}><Text style={styles.settingsButtonText}>ذخیره</Text></Pressable></View> : null}
        </View></View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function ChatBubble({ message, colors, styles }: { message: ChatMessage; colors: ReturnType<typeof useColors>; styles: ReturnType<typeof createStyles> }) {
  const user = message.role === 'user';
  return <View style={[styles.bubbleRow, user ? styles.userBubbleRow : styles.modelBubbleRow]}>{!user ? <View style={styles.modelIcon}><Feather name="music" size={14} color={colors.primaryForeground} /></View> : null}<View style={[styles.bubble, user ? styles.userBubble : styles.modelBubble]}><Text style={[styles.bubbleText, user && styles.userBubbleText]}>{message.text}</Text></View></View>;
}
function createMessageId(role: ChatMessage['role']): string { return `${role}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
function getErrorNeedsSettings(value: string): boolean { return value.includes('تنظیمات') || value.includes('کلید Gemini'); }
function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 }, headerCopy: { flex: 1, alignItems: 'flex-end' }, headerActions: { flexDirection: 'row', gap: 8 }, iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, eyebrow: { color: colors.mutedForeground, fontSize: 12, textAlign: 'right', marginBottom: 4 }, title: { color: colors.foreground, fontSize: 32, fontWeight: '700', textAlign: 'right' }, messages: { paddingHorizontal: 18, gap: 12 }, bubbleRow: { width: '100%', flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8 }, userBubbleRow: { justifyContent: 'flex-start' }, modelBubbleRow: { justifyContent: 'flex-end' }, modelIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 3 }, bubble: { maxWidth: '82%', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 19, borderWidth: 1 }, userBubble: { backgroundColor: colors.primary, borderColor: colors.primary, borderBottomLeftRadius: 6 }, modelBubble: { backgroundColor: colors.card, borderColor: colors.border, borderBottomRightRadius: 6 }, bubbleText: { color: colors.foreground, fontSize: 14, lineHeight: 24, textAlign: 'right' }, userBubbleText: { color: colors.primaryForeground }, typingRow: { width: '100%', alignItems: 'flex-end', paddingBottom: 4 }, typingBubble: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 12, backgroundColor: colors.card, borderRadius: 16 }, typingText: { color: colors.mutedForeground, fontSize: 11 }, composerArea: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }, composer: { minHeight: 54, flexDirection: 'row', alignItems: 'flex-end', gap: 9, padding: 6, borderRadius: 19, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.card }, input: { flex: 1, minHeight: 40, maxHeight: 110, color: colors.foreground, fontSize: 14, lineHeight: 22, paddingHorizontal: 9, paddingTop: 9, paddingBottom: 7 }, sendButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, sendButtonDisabled: { opacity: 0.42 }, privacyHint: { color: colors.mutedForeground, fontSize: 10, textAlign: 'center', marginTop: 7 }, errorBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, margin: 8, padding: 10, borderRadius: 13, backgroundColor: colors.muted }, errorText: { flex: 1, color: colors.destructive, fontSize: 11, textAlign: 'right' }, settingsButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700' }, loading: { position: 'absolute', top: 110, alignSelf: 'center' }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }, historyCard: { maxHeight: '82%', backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 }, historyHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, historyTitle: { color: colors.foreground, fontSize: 20, fontWeight: '700' }, historyItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border }, historyOpen: { flex: 1 }, historyText: { color: colors.foreground, textAlign: 'right', fontSize: 14 }, historyMeta: { color: colors.mutedForeground, textAlign: 'right', fontSize: 11, marginTop: 3 }, emptyHistory: { color: colors.mutedForeground, textAlign: 'center', padding: 30 }, renameRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingTop: 12 }, renameInput: { flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: 10, color: colors.foreground, padding: 9 },
  });
}