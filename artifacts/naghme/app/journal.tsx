import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { MINI_PLAYER_CONTENT_PADDING, useMiniPlayerActive } from '@/hooks/useMiniPlayerActive';
import {
  addJournalEntry,
  ArchiveArtistOption,
  ArchiveDateRange,
  deleteJournalEntry,
  getJournalEntriesPage,
  getJournalEntryArtists,
  getJournalEntryCount,
  JournalArchiveRecord,
  JournalArchiveFilters,
  SearchResult,
  searchLibraryByFilter,
  updateJournalEntry,
} from '@/src/db/queries';

const PAGE_SIZE = 30;
const moodOptions = [
  { value: 'آرام', icon: 'moon' as const },
  { value: 'غمگین', icon: 'cloud-rain' as const },
  { value: 'متفکر', icon: 'book-open' as const },
  { value: 'پرانرژی', icon: 'sun' as const },
];
const dateOptions: Array<{ value: ArchiveDateRange; label: string }> = [
  { value: 'all', label: 'همه' },
  { value: 'week', label: 'هفت روز اخیر' },
  { value: 'month', label: 'ماه اخیر' },
  { value: 'year', label: 'سال اخیر' },
];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function JournalScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const miniPlayerActive = useMiniPlayerActive();
  const params = useLocalSearchParams<{
    mood?: string | string[];
    artistId?: string | string[];
    trackId?: string | string[];
  }>();
  const routeArtistId = firstParam(params.artistId) ?? null;
  const routeTrackId = firstParam(params.trackId) ?? null;
  const [entries, setEntries] = useState<JournalArchiveRecord[]>([]);
  const [artists, setArtists] = useState<ArchiveArtistOption[]>([]);
  const [mood, setMood] = useState<string | null>(firstParam(params.mood) ?? null);
  const [dateRange, setDateRange] = useState<ArchiveDateRange>('all');
  const [artistId, setArtistId] = useState<string | null>(routeArtistId);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<JournalArchiveRecord | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<SearchResult | null>(null);
  const [trackSearch, setTrackSearch] = useState('');
  const [trackResults, setTrackResults] = useState<SearchResult[]>([]);
  const [selectedMood, setSelectedMood] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const filters = useMemo<JournalArchiveFilters>(
    () => ({ mood, dateRange, artistId, trackId: routeTrackId, search }),
    [artistId, dateRange, mood, routeTrackId, search],
  );

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextEntries, nextTotal] = await Promise.all([
        getJournalEntriesPage(filters, PAGE_SIZE, 0),
        getJournalEntryCount(filters),
      ]);
      setEntries(nextEntries);
      setTotal(nextTotal);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن دفترچه انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([
        loadFirstPage(),
        getJournalEntryArtists().then(setArtists).catch(() => undefined),
      ]);
    }, [loadFirstPage]),
  );

  useEffect(() => {
    let active = true;
    if (!trackSearch.trim()) {
      setTrackResults([]);
      return () => {
        active = false;
      };
    }
    void searchLibraryByFilter(trackSearch, 'track', 12)
      .then((results) => {
        if (active) setTrackResults(results);
      })
      .catch(() => {
        if (active) setTrackResults([]);
      });
    return () => {
      active = false;
    };
  }, [trackSearch]);

  const loadMore = async () => {
    if (loading || loadingMore || entries.length >= total) return;
    setLoadingMore(true);
    try {
      const nextEntries = await getJournalEntriesPage(filters, PAGE_SIZE, entries.length);
      setEntries((current) => [...current, ...nextEntries]);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'ادامه‌ی دفترچه خوانده نشد.');
    } finally {
      setLoadingMore(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setSelectedTrack(null);
    setTrackSearch('');
    setTrackResults([]);
    setSelectedMood('');
    setNote('');
    setModalMessage('');
    setModalVisible(true);
  };

  const openEdit = (entry: JournalArchiveRecord) => {
    setEditing(entry);
    setSelectedTrack({
      id: entry.trackId,
      title: entry.trackTitle,
      subtitle: entry.artistName,
      type: 'track',
      matchSource: 'title',
    });
    setSelectedMood(entry.mood);
    setNote(entry.note);
    setTrackSearch('');
    setTrackResults([]);
    setModalMessage('');
    setModalVisible(true);
  };

  const submit = async () => {
    if (saving) return;
    if (!selectedMood) {
      setModalMessage('اول حال خودت را انتخاب کن.');
      return;
    }
    if (!note.trim()) {
      setModalMessage('چند کلمه از حال امروزت بنویس.');
      return;
    }
    if (!editing && !selectedTrack) {
      setModalMessage('قطعه‌ای را برای این یادداشت انتخاب کن.');
      return;
    }
    setSaving(true);
    setModalMessage('');
    try {
      if (editing) {
        await updateJournalEntry(editing.id, { mood: selectedMood, note });
      } else {
        await addJournalEntry({ trackId: selectedTrack!.id, mood: selectedMood, note });
      }
      setModalVisible(false);
      await loadFirstPage();
    } catch (saveError: unknown) {
      setModalMessage(saveError instanceof Error ? saveError.message : 'ذخیره‌ی یادداشت انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (entry: JournalArchiveRecord) => {
    Alert.alert(
      'حذف یادداشت',
      `یادداشت مربوط به «${entry.trackTitle}» حذف شود؟`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void deleteJournalEntry(entry.id)
              .then(() => loadFirstPage())
              .catch((deleteError: unknown) =>
                setError(deleteError instanceof Error ? deleteError.message : 'حذف یادداشت انجام نشد.'),
              );
          },
        },
      ],
    );
  };

  const activeArtistName = artists.find((artist) => artist.id === artistId)?.name;

  return (
    <View style={styles.screen}>
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item }) => (
          <JournalRow
            entry={item}
            colors={colors}
            styles={styles}
            onOpen={() => router.push(`/track/${item.trackId}`)}
            onEdit={() => openEdit(item)}
            onDelete={() => confirmDelete(item)}
          />
        )}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.35}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          miniPlayerActive && { paddingBottom: 104 + MINI_PLAYER_CONTENT_PADDING },
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Pressable
                testID="journal-back"
                accessibilityRole="button"
                accessibilityLabel="بازگشت"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              >
                <Feather name="arrow-right" size={21} color={colors.foreground} />
              </Pressable>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>لحظه‌هایی که با موسیقی ماندند</Text>
                <Text style={styles.title}>دفترچه</Text>
                <Text style={styles.subtitle}>
                  {activeArtistName ? `یادداشت‌های ${activeArtistName}` : routeTrackId ? 'یادداشت‌های این قطعه' : 'همه‌ی حال‌ها و خاطره‌ها'}
                </Text>
              </View>
              <View style={styles.headerIcon}>
                <Feather name="book-open" size={23} color={colors.primary} />
              </View>
            </View>

            <View style={styles.toolbar}>
              <Pressable
                testID="journal-add"
                accessibilityRole="button"
                onPress={openNew}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
              >
                <Feather name="plus" size={18} color={colors.primaryForeground} />
                <Text style={styles.addButtonText}>یادداشت تازه</Text>
              </Pressable>
              <Text style={styles.resultCount}>{total} یادداشت</Text>
            </View>

            <View style={styles.filterCard}>
              <View style={styles.searchBox}>
                <Feather name="search" size={17} color={colors.mutedForeground} />
                <TextInput
                  testID="journal-search"
                  value={search}
                  onChangeText={setSearch}
                  placeholder="جست‌وجو در متن یا نام قطعه"
                  placeholderTextColor={colors.mutedForeground}
                  style={styles.searchInput}
                  textAlign="right"
                  returnKeyType="search"
                />
              </View>
              <Text style={styles.filterLabel}>بازه‌ی زمانی</Text>
              <ChipRow
                items={dateOptions}
                selected={dateRange}
                onSelect={(value) => setDateRange(value as ArchiveDateRange)}
                colors={colors}
                styles={styles}
              />
              <Text style={styles.filterLabel}>حال‌وهوا</Text>
              <ChipRow
                items={[{ value: '', label: 'همه' }, ...moodOptions.map(({ value }) => ({ value, label: value }))]}
                selected={mood ?? ''}
                onSelect={(value) => setMood(value || null)}
                colors={colors}
                styles={styles}
                icons
              />
              {artists.length ? (
                <>
                  <Text style={styles.filterLabel}>هنرمند</Text>
                  <ChipRow
                    items={[{ value: '', label: 'همه' }, ...artists.map((artist) => ({ value: artist.id, label: artist.name }))]}
                    selected={artistId ?? ''}
                    onSelect={(value) => setArtistId(value || null)}
                    colors={colors}
                    styles={styles}
                  />
                </>
              ) : null}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyBox}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}><Feather name="feather" size={24} color={colors.primary} /></View>
              <Text style={styles.emptyTitle}>دفترچه هنوز چیزی برای گفتن ندارد</Text>
              <Text style={styles.emptyText}>یک قطعه انتخاب کن و حال امروزت را برایش بنویس.</Text>
              <Pressable onPress={openNew} style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}>
                <Text style={styles.emptyButtonText}>نوشتن اولین یادداشت</Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.footerLoader} /> : null}
      />
      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={16} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <JournalModal
        visible={modalVisible}
        editing={Boolean(editing)}
        selectedTrack={selectedTrack}
        trackSearch={trackSearch}
        trackResults={trackResults}
        selectedMood={selectedMood}
        note={note}
        message={modalMessage}
        saving={saving}
        colors={colors}
        styles={styles}
        onClose={() => !saving && setModalVisible(false)}
        onTrackSearch={setTrackSearch}
        onTrackSelect={(track) => {
          setSelectedTrack(track);
          setTrackSearch('');
          setTrackResults([]);
        }}
        onMoodChange={setSelectedMood}
        onNoteChange={setNote}
        onSubmit={() => void submit()}
      />
    </View>
  );
}

function JournalRow({
  entry,
  colors,
  styles,
  onOpen,
  onEdit,
  onDelete,
}: {
  entry: JournalArchiveRecord;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.entryCard}>
      <Pressable onPress={onOpen} style={({ pressed }) => [styles.entryMain, pressed && styles.pressed]}>
        {entry.coverImage ? (
          <Image source={{ uri: entry.coverImage }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}><Feather name="music" size={19} color={colors.primary} /></View>
        )}
        <View style={styles.entryCopy}>
          <View style={styles.entryTopline}>
            <View style={styles.moodBadge}>
              <Feather name={moodIcon(entry.mood)} size={13} color={colors.primary} />
              <Text style={styles.moodText}>{entry.mood}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(entry.createdAt)}</Text>
          </View>
          <Text style={styles.noteText} numberOfLines={3}>{entry.note}</Text>
          <Text style={styles.trackText} numberOfLines={1}>{entry.trackTitle}</Text>
          <Text style={styles.artistText} numberOfLines={1}>{entry.artistName ?? 'هنرمند نامشخص'}</Text>
        </View>
      </Pressable>
      <View style={styles.entryActions}>
        <Pressable testID={`journal-edit-${entry.id}`} accessibilityRole="button" accessibilityLabel="ویرایش یادداشت" onPress={onEdit} hitSlop={8} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Feather name="edit-2" size={15} color={colors.primary} />
        </Pressable>
        <Pressable testID={`journal-delete-${entry.id}`} accessibilityRole="button" accessibilityLabel="حذف یادداشت" onPress={onDelete} hitSlop={8} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Feather name="trash-2" size={15} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

function ChipRow({
  items,
  selected,
  onSelect,
  colors,
  styles,
  icons = false,
}: {
  items: Array<{ value: string; label: string }>;
  selected: string;
  onSelect: (value: string) => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  icons?: boolean;
}) {
  return (
    <FlatList
      horizontal
      inverted
      data={items}
      keyExtractor={(item) => item.value || 'all'}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      renderItem={({ item }) => {
        const active = item.value === selected;
        return (
          <Pressable onPress={() => onSelect(item.value)} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
            {icons && item.value ? <Feather name={moodIcon(item.value)} size={13} color={active ? colors.primaryForeground : colors.primary} /> : null}
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
          </Pressable>
        );
      }}
    />
  );
}

function JournalModal({
  visible,
  editing,
  selectedTrack,
  trackSearch,
  trackResults,
  selectedMood,
  note,
  message,
  saving,
  colors,
  styles,
  onClose,
  onTrackSearch,
  onTrackSelect,
  onMoodChange,
  onNoteChange,
  onSubmit,
}: {
  visible: boolean;
  editing: boolean;
  selectedTrack: SearchResult | null;
  trackSearch: string;
  trackResults: SearchResult[];
  selectedMood: string;
  note: string;
  message: string;
  saving: boolean;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onClose: () => void;
  onTrackSearch: (value: string) => void;
  onTrackSelect: (track: SearchResult | null) => void;
  onMoodChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <KeyboardAwareScrollViewCompat contentContainerStyle={styles.modalContainer} keyboardShouldPersistTaps="handled" bottomOffset={20} showsVerticalScrollIndicator={false}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Pressable onPress={onClose} style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}>
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>دفترچه‌ی شخصی</Text>
                <Text style={styles.modalTitle}>{editing ? 'ویرایش یادداشت' : 'ثبت یک لحظه‌ی تازه'}</Text>
              </View>
              <View style={styles.modalIcon}><Feather name="feather" size={19} color={colors.primary} /></View>
            </View>
            <Text style={styles.modalLabel}>قطعه</Text>
            {selectedTrack ? (
              <View style={styles.selectedTrack}>
                <View style={styles.selectedTrackCopy}>
                  <Text style={styles.selectedTrackTitle} numberOfLines={1}>{selectedTrack.title}</Text>
                  <Text style={styles.selectedTrackArtist} numberOfLines={1}>{selectedTrack.subtitle ?? 'هنرمند نامشخص'}</Text>
                </View>
                {!editing ? (
                  <Pressable onPress={() => onTrackSelect(null as unknown as SearchResult)} accessibilityLabel="تغییر قطعه" style={({ pressed }) => [styles.changeTrackButton, pressed && styles.pressed]}>
                    <Text style={styles.changeTrackText}>تغییر</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <>
                <View style={styles.searchBox}>
                  <Feather name="search" size={17} color={colors.mutedForeground} />
                  <TextInput value={trackSearch} onChangeText={onTrackSearch} placeholder="نام قطعه را جست‌وجو کن" placeholderTextColor={colors.mutedForeground} style={styles.searchInput} textAlign="right" />
                </View>
                {trackResults.map((result) => (
                  <Pressable key={result.id} onPress={() => onTrackSelect(result)} style={({ pressed }) => [styles.trackResult, pressed && styles.pressed]}>
                    <Feather name="music" size={16} color={colors.primary} />
                    <View style={styles.trackResultCopy}>
                      <Text style={styles.trackResultTitle}>{result.title}</Text>
                      <Text style={styles.trackResultSubtitle}>{result.subtitle ?? 'قطعه'}</Text>
                    </View>
                  </Pressable>
                ))}
              </>
            )}
            <Text style={styles.modalLabel}>حال امروز</Text>
            <View style={styles.moodGrid}>
              {moodOptions.map((option) => {
                const active = selectedMood === option.value;
                return (
                  <Pressable key={option.value} onPress={() => onMoodChange(option.value)} style={({ pressed }) => [styles.moodOption, active && styles.moodOptionActive, pressed && styles.pressed]}>
                    <Feather name={option.icon} size={16} color={active ? colors.primaryForeground : colors.primary} />
                    <Text style={[styles.moodOptionText, active && styles.moodOptionTextActive]}>{option.value}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.modalLabel}>یادداشت کوتاه</Text>
            <TextInput value={note} onChangeText={onNoteChange} multiline maxLength={500} placeholder="این قطعه امروز تو را به کجا می‌برد؟" placeholderTextColor={colors.mutedForeground} selectionColor={colors.primary} style={styles.noteInput} textAlign="right" textAlignVertical="top" />
            {message ? <Text style={styles.modalMessage}>{message}</Text> : null}
            <Pressable disabled={saving} onPress={onSubmit} style={({ pressed }) => [styles.submitButton, (pressed || saving) && styles.pressed]}>
              {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <><Feather name="check" size={18} color={colors.primaryForeground} /><Text style={styles.submitText}>{editing ? 'ذخیره‌ی ویرایش' : 'ثبت در دفترچه'}</Text></>}
            </Pressable>
          </View>
        </KeyboardAwareScrollViewCompat>
      </View>
    </Modal>
  );
}

function moodIcon(mood: string): 'moon' | 'cloud-rain' | 'book-open' | 'sun' {
  return moodOptions.find((option) => option.value === mood)?.icon ?? 'moon';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'زمان نامشخص';
  try {
    return date.toLocaleDateString('fa-IR', { day: 'numeric', month: 'short' });
  } catch {
    return date.toLocaleDateString();
  }
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, paddingTop: (Platform.OS === 'web' ? 67 : 0) + 16, paddingBottom: 34, flexGrow: 1 },
    header: { flexDirection: 'row-reverse', alignItems: 'flex-start', marginBottom: 22 },
    backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
     headerCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end', paddingHorizontal: 3 },
    eyebrow: { color: colors.mutedForeground, fontSize: 13, textAlign: 'right', marginBottom: 5 },
    title: { color: colors.foreground, fontSize: 30, lineHeight: 38, fontWeight: '700', textAlign: 'right' },
    subtitle: { color: colors.primary, fontSize: 12, textAlign: 'right', marginTop: 6 },
    headerIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    toolbar: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    addButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, minHeight: 43, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.primary },
     addButtonText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
    resultCount: { color: colors.mutedForeground, fontSize: 12 },
    filterCard: { padding: 13, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 18 },
    searchBox: { minHeight: 43, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 13, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
    searchInput: { flex: 1, color: colors.foreground, fontSize: 13, minHeight: 40 },
    filterLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: '700', textAlign: 'right', marginTop: 13, marginBottom: 7 },
    chips: { flexDirection: 'row-reverse', gap: 7 },
    chip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 11, minHeight: 34, borderRadius: 11, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.foreground, fontSize: 11, fontWeight: '600' },
    chipTextActive: { color: colors.primaryForeground },
    entryCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 12, marginBottom: 10 },
    entryMain: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 11 },
    cover: { width: 62, height: 62, borderRadius: 15, backgroundColor: colors.accent },
    coverFallback: { alignItems: 'center', justifyContent: 'center' },
    entryCopy: { flex: 1, minWidth: 0 },
    entryTopline: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
    moodBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.accent },
    moodText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
    dateText: { color: colors.mutedForeground, fontSize: 10 },
    noteText: { color: colors.cardForeground, fontSize: 14, lineHeight: 22, textAlign: 'right', marginTop: 8 },
    trackText: { color: colors.foreground, fontSize: 12, fontWeight: '700', textAlign: 'right', marginTop: 7 },
    artistText: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right', marginTop: 2 },
    entryActions: { flexDirection: 'row-reverse', justifyContent: 'flex-start', gap: 12, marginTop: 6 },
    iconButton: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted },
    emptyBox: { minHeight: 240, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, padding: 24, marginTop: 2 },
    emptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    emptyTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700', textAlign: 'center' },
    emptyText: { color: colors.mutedForeground, fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: 7 },
    emptyButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.primary, marginTop: 16 },
    emptyButtonText: { color: colors.primaryForeground, fontSize: 12, fontWeight: '700' },
    footerLoader: { marginVertical: 18 },
    errorBox: { position: 'absolute', left: 20, right: 20, bottom: 18, flexDirection: 'row-reverse', gap: 8, alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.destructive },
    errorText: { flex: 1, color: colors.destructive, fontSize: 12, lineHeight: 19, textAlign: 'right' },
    pressed: { opacity: 0.76 },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17, 24, 39, 0.54)' },
    modalContainer: { flexGrow: 1, justifyContent: 'flex-end' },
    modalCard: { maxHeight: '92%', padding: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.background },
    modalHeader: { flexDirection: 'row-reverse', alignItems: 'flex-start', marginBottom: 19 },
    modalClose: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted },
    modalHeaderCopy: { flex: 1, alignItems: 'flex-end', paddingHorizontal: 10 },
    modalEyebrow: { color: colors.mutedForeground, fontSize: 11, marginBottom: 4 },
    modalTitle: { color: colors.foreground, fontSize: 20, fontWeight: '700', textAlign: 'right' },
    modalIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    modalLabel: { color: colors.foreground, fontSize: 13, fontWeight: '700', textAlign: 'right', marginTop: 5, marginBottom: 8 },
    selectedTrack: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, minHeight: 53, padding: 11, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    selectedTrackCopy: { flex: 1, alignItems: 'flex-end' },
    selectedTrackTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
    selectedTrackArtist: { color: colors.mutedForeground, fontSize: 11, marginTop: 3 },
    changeTrackButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.accent },
    changeTrackText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    trackResult: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, minHeight: 49, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    trackResultCopy: { flex: 1, alignItems: 'flex-end' },
    trackResultTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
    trackResultSubtitle: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
    moodGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    moodOption: { flex: 1, minWidth: '46%', minHeight: 40, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    moodOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    moodOptionText: { color: colors.foreground, fontSize: 12, fontWeight: '600' },
    moodOptionTextActive: { color: colors.primaryForeground },
    noteInput: { minHeight: 100, padding: 12, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.foreground, fontSize: 13, lineHeight: 21 },
    modalMessage: { color: colors.destructive, fontSize: 12, textAlign: 'right', marginTop: 8 },
    submitButton: { minHeight: 47, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: colors.primary, marginTop: 16 },
    submitText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
  });
}