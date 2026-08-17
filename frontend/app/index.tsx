import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deletePunch, getPunches, getSettings, Punch, savePunch, saveSettings, Session, Settings } from '@/src/attendance';

const INDIA = 'Asia/Kolkata';
const colors = { ink: '#0F172A', muted: '#64748B', blue: '#2563EB', green: '#16A34A', red: '#DC2626', bg: '#F8FAFC', line: '#E2E8F0', white: '#FFFFFF', amber: '#CA8A04' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateInIndia = () => new Intl.DateTimeFormat('en-CA', { timeZone: INDIA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const formatDate = (date: string) => new Intl.DateTimeFormat('en-IN', { timeZone: INDIA, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${date}T00:00:00+05:30`));
const formatTime = (iso: string) => new Intl.DateTimeFormat('en-IN', { timeZone: INDIA, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const displayMonth = (date: string) => new Intl.DateTimeFormat('en-IN', { timeZone: INDIA, month: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00+05:30`));

type Banner = { type: 'success' | 'error'; text: string } | null;

export default function Index() {
  const insets = useSafeAreaInsets();
  const today = dateInIndia();
  const [punches, setPunches] = useState<Punch[]>([]);
  const [settings, setSettings] = useState<Settings>({ morningTime: '09:30', eveningTime: '19:00', notifications: true });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(`${today.slice(0, 7)}-01`);
  const [editing, setEditing] = useState<Punch | null>(null);
  const [editTime, setEditTime] = useState('');
  const [deleting, setDeleting] = useState<Punch | null>(null);
  const [banner, setBanner] = useState<Banner>(null);

  useEffect(() => {
    (async () => {
      try {
        const [items, prefs] = await Promise.all([getPunches(), getSettings()]);
        setPunches(items);
        setSettings(prefs);
      } catch (error: any) {
        setBanner({ type: 'error', text: error?.message || 'Could not load data from Supabase.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const todayPunch = (session: Session) => punches.find((p) => p.date === today && p.session === session);
  const morning = todayPunch('morning'); const evening = todayPunch('evening');
  const completeDays = useMemo(() => historyRowsFrom(punches).filter((r) => r.morning && r.evening).length, [punches]);
  const rows = useMemo(() => historyRowsFrom(punches), [punches]);
  const missed = rows.filter((row) => !row.morning || !row.evening).length;
  const percentage = rows.length ? Math.round((rows.filter((r) => r.morning && r.evening).length / rows.length) * 100) : 0;

  const enableNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  };

  const upsertLocal = (saved: Punch) => setPunches((all) => [saved, ...all.filter((p) => !(p.date === saved.date && p.session === saved.session))]);

  const punch = async (session: Session) => {
    setBusy(true);
    try {
      const saved = await savePunch(session, today, new Date().toISOString());
      upsertLocal(saved);
      setBanner({ type: 'success', text: 'Punch saved to Supabase.' });
    } catch (error: any) {
      setBanner({ type: 'error', text: error?.message || 'Supabase could not save this punch.' });
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setBusy(true);
    try {
      await deletePunch(target);
      setPunches((all) => all.filter((p) => !(p.date === target.date && p.session === target.session)));
      setBanner({ type: 'success', text: 'Punch deleted from Supabase.' });
      setDeleting(null);
    } catch (error: any) {
      setBanner({ type: 'error', text: error?.message || 'Supabase could not delete this punch.' });
    } finally { setBusy(false); }
  };

  const edit = async () => {
    if (!editing || !/^\d{1,2}:\d{2}$/.test(editTime)) return;
    const [hour, minute] = editTime.split(':').map(Number);
    const iso = new Date(`${editing.date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`).toISOString();
    setBusy(true);
    try {
      const saved = await savePunch(editing.session, editing.date, iso);
      upsertLocal(saved);
      setBanner({ type: 'success', text: 'Punch updated in Supabase.' });
      setEditing(null);
    } catch (error: any) {
      setBanner({ type: 'error', text: error?.message || 'Supabase could not update this punch.' });
    } finally { setBusy(false); }
  };

  const saveReminderSettings = async () => {
    setBusy(true);
    try {
      if (settings.notifications) await enableNotifications();
      const saved = await saveSettings(settings);
      setSettings(saved);
      setBanner({ type: 'success', text: 'Reminder settings saved to Supabase.' });
      setSettingsOpen(false);
    } catch (error: any) {
      setBanner({ type: 'error', text: error?.message || 'Supabase could not save your settings.' });
    } finally { setBusy(false); }
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator color={colors.blue} size="large" /><Text style={styles.muted}>Loading your attendance</Text></View>;
  return <View style={[styles.page, { paddingTop: insets.top + 12 }]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topbar}><View><Text style={styles.eyebrow}>PULSE / ATTENDANCE</Text><Text style={styles.brand}>Good day.</Text></View><Pressable testID="settings-button" style={styles.iconButton} onPress={() => setSettingsOpen(true)}><Ionicons name="options-outline" size={22} color={colors.ink} /></Pressable></View>
      <View style={styles.dateRow}><Ionicons name="calendar-outline" size={17} color={colors.blue} /><Text style={styles.dateText}>{formatDate(today)}</Text><View style={styles.tz}><Text style={styles.tzText}>IST</Text></View></View>
      {!!banner && <View testID="status-banner" style={[styles.syncNotice, banner.type === 'error' ? styles.syncNoticeError : styles.syncNoticeOk]}><Ionicons name={banner.type === 'success' ? 'cloud-done-outline' : 'warning-outline'} size={17} color={banner.type === 'success' ? colors.green : colors.red} /><Text style={[styles.syncText, banner.type === 'error' && { color: colors.red }]}>{banner.text}</Text></View>}
      <View style={styles.hero}><View><Text style={styles.heroLabel}>TODAY&apos;S READINESS</Text><Text style={styles.heroTitle}>{morning && evening ? 'All clear.' : 'Stay on track.'}</Text><Text style={styles.heroCopy}>{morning && evening ? 'Both biometric punches are recorded.' : 'Two quick taps, and your day is accounted for.'}</Text></View><View style={styles.ring}><Text style={styles.ringValue}>{morning && evening ? '100' : morning || evening ? '50' : '0'}<Text style={styles.ringPercent}>%</Text></Text><Text style={styles.ringLabel}>TODAY</Text></View></View>
      {(!morning || !evening) && <View style={styles.reminder}><Ionicons name="notifications-outline" size={19} color={colors.amber} /><Text style={styles.reminderText}>{!morning ? `Morning punch not recorded · after ${settings.morningTime}` : `Evening punch not recorded · after ${settings.eveningTime}`}</Text></View>}
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Today&apos;s punches</Text><Text style={styles.sectionHint}>ASIA/KOLKATA</Text></View>
      <PunchCard session="morning" item={morning} busy={busy} onPunch={() => punch('morning')} onEdit={(item) => { setEditing(item); setEditTime(formatTime(item.punchedAt)); }} onDelete={setDeleting} />
      <PunchCard session="evening" item={evening} busy={busy} onPunch={() => punch('evening')} onEdit={(item) => { setEditing(item); setEditTime(formatTime(item.punchedAt)); }} onDelete={setDeleting} />
      <View style={styles.stats}><Stat value={String(completeDays)} label="Complete days" icon="checkmark-circle-outline" color={colors.green} /><Stat value={String(missed)} label="Days to review" icon="alert-circle-outline" color={colors.amber} /><Stat value={`${percentage}%`} label="Attendance rate" icon="trending-up-outline" color={colors.blue} /></View>
      <Pressable testID="history-button" style={styles.historyButton} onPress={() => setHistory(!history)}><Text style={styles.historyText}>{history ? 'Hide punch history' : 'View punch history'}</Text><Ionicons name={history ? 'chevron-up' : 'chevron-forward'} size={18} color={colors.blue} /></Pressable>
      {history && <CalendarHistory punches={punches} month={calendarMonth} onMonthChange={setCalendarMonth} />}
      <Text style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>Your attendance, made effortless.</Text>
    </ScrollView>
    <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}><View style={styles.modalShade}><View style={styles.modal}><View style={styles.modalTitleRow}><Text style={styles.modalTitle}>Reminder settings</Text><Pressable testID="close-settings" onPress={() => setSettingsOpen(false)}><Ionicons name="close" size={24} color={colors.ink} /></Pressable></View><Text style={styles.modalCopy}>Choose when Pulse should flag an unrecorded punch. Times use IST and are saved to Supabase.</Text><Text style={styles.inputLabel}>Morning reminder</Text><TextInput testID="morning-time-input" value={settings.morningTime} onChangeText={(v) => setSettings({ ...settings, morningTime: v })} style={styles.input} keyboardType="numbers-and-punctuation" /><Text style={styles.inputLabel}>Evening reminder</Text><TextInput testID="evening-time-input" value={settings.eveningTime} onChangeText={(v) => setSettings({ ...settings, eveningTime: v })} style={styles.input} keyboardType="numbers-and-punctuation" /><View style={styles.switchRow}><Text style={styles.switchText}>Browser notifications</Text><Switch testID="notifications-toggle" value={settings.notifications} onValueChange={(v) => setSettings({ ...settings, notifications: v })} trackColor={{ true: colors.blue }} /></View><Pressable testID="save-settings" disabled={busy} style={[styles.saveButton, busy && styles.buttonBusy]} onPress={saveReminderSettings}><Text style={styles.saveText}>{busy ? 'Saving…' : 'Save preferences'}</Text></Pressable></View></View></Modal>
    <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}><View style={styles.modalShade}><View style={styles.modal}><Text style={styles.modalTitle}>Edit {editing?.session} punch</Text><Text style={styles.modalCopy}>Set the exact time in 24-hour format.</Text><TextInput testID="edit-time-input" value={editTime} onChangeText={setEditTime} style={styles.input} keyboardType="numbers-and-punctuation" placeholder="08:42" /><Pressable testID="save-edit" disabled={busy} style={[styles.saveButton, busy && styles.buttonBusy]} onPress={edit}><Text style={styles.saveText}>{busy ? 'Saving…' : 'Save time'}</Text></Pressable><Pressable style={styles.cancelButton} onPress={() => setEditing(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable></View></View></Modal>
    <Modal visible={!!deleting} transparent animationType="fade" onRequestClose={() => setDeleting(null)}><View style={styles.modalShade}><View style={styles.modal}><Text style={styles.modalTitle}>Delete punch?</Text><Text style={styles.modalCopy}>Remove the {deleting?.session} entry for {deleting ? displayMonth(deleting.date) : ''}? This permanently deletes it from Supabase.</Text><Pressable testID="confirm-delete" disabled={busy} style={[styles.deleteButton, busy && styles.buttonBusy]} onPress={confirmDelete}><Text style={styles.saveText}>{busy ? 'Deleting…' : 'Delete entry'}</Text></Pressable><Pressable testID="cancel-delete" style={styles.cancelButton} onPress={() => setDeleting(null)}><Text style={styles.cancelText}>Keep entry</Text></Pressable></View></View></Modal>
  </View>;
}

function historyRowsFrom(punches: Punch[]) {
  const dates = [...new Set(punches.map((p) => p.date))].sort().reverse();
  return dates.map((date) => ({ date, morning: punches.find((p) => p.date === date && p.session === 'morning'), evening: punches.find((p) => p.date === date && p.session === 'evening') }));
}

function PunchCard({ session, item, busy, onPunch, onEdit, onDelete }: { session: Session; item?: Punch; busy: boolean; onPunch: () => void; onEdit: (item: Punch) => void; onDelete: (item: Punch) => void }) { const isMorning = session === 'morning'; return <View style={[styles.card, item ? styles.cardDone : undefined]}><View style={styles.cardTop}><View style={[styles.sessionIcon, { backgroundColor: item ? '#DCFCE7' : '#EFF6FF' }]}><Ionicons name={isMorning ? 'sunny-outline' : 'moon-outline'} size={22} color={item ? colors.green : colors.blue} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{isMorning ? 'Morning punch' : 'Evening punch'}</Text><Text style={styles.cardSub}>{item ? `Recorded at ${formatTime(item.punchedAt)}` : isMorning ? 'Start your day accounted for' : 'Close out your day accounted for'}</Text></View><View style={styles.statusPill}><View style={[styles.dot, { backgroundColor: item ? colors.green : '#CBD5E1' }]} /><Text style={[styles.statusText, { color: item ? colors.green : colors.muted }]}>{item ? 'Punched' : 'Not punched'}</Text></View></View>{item ? <View style={styles.actionRow}><Text style={styles.exact}>{formatDate(item.date)} · {formatTime(item.punchedAt)}</Text><View style={styles.actions}><Pressable testID={`${session}-edit`} onPress={() => onEdit(item)}><Text style={styles.action}>Edit</Text></Pressable><Pressable testID={`${session}-delete`} onPress={() => onDelete(item)}><Text style={[styles.action, { color: colors.red }]}>Delete</Text></Pressable></View></View> : <Pressable testID={`${session}-punch-button`} disabled={busy} style={[styles.punchButton, busy && styles.buttonBusy]} onPress={onPunch}><Ionicons name="finger-print-outline" size={21} color={colors.white} /><Text style={styles.punchText}>Mark as punched</Text></Pressable>}</View>; }
function Stat({ value, label, icon, color }: { value: string; label: string; icon: any; color: string }) { return <View style={styles.stat}><Ionicons name={icon} size={18} color={color} /><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }

function CalendarHistory({ punches, month, onMonthChange }: { punches: Punch[]; month: string; onMonthChange: (month: string) => void }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const [pickerYear, setPickerYear] = useState(year);
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const firstDay = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const monthName = `${MONTHS[monthIndex]} ${year}`;
  const nowYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => nowYear - 5 + i);

  const openPicker = () => { setPickerYear(year); setPickerOpen(true); };
  const moveMonth = (delta: number) => { const next = new Date(Date.UTC(year, monthIndex + delta, 1)); setSelectedDate(null); onMonthChange(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`); };
  const chooseMonth = (index: number) => { setSelectedDate(null); onMonthChange(`${pickerYear}-${String(index + 1).padStart(2, '0')}-01`); setPickerOpen(false); };

  const cells = Array.from({ length: firstDay }, (_, index) => <View key={`blank-${index}`} style={styles.calendarCell} />);
  for (let day = 1; day <= days; day += 1) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const morning = punches.find((p) => p.date === date && p.session === 'morning');
    const evening = punches.find((p) => p.date === date && p.session === 'evening');
    cells.push(<Pressable key={date} testID={`calendar-day-${date}`} onPress={() => setSelectedDate(date)} style={[styles.calendarCell, morning && evening ? styles.calendarComplete : undefined, selectedDate === date ? styles.calendarSelected : undefined]}><Text style={styles.calendarDay}>{day}</Text><View style={styles.calendarDots}><View style={[styles.calendarDot, { backgroundColor: morning ? colors.green : '#CBD5E1' }]} /><View style={[styles.calendarDot, { backgroundColor: evening ? colors.blue : '#CBD5E1' }]} /></View></Pressable>);
  }
  const selectedMorning = selectedDate ? punches.find((p) => p.date === selectedDate && p.session === 'morning') : undefined;
  const selectedEvening = selectedDate ? punches.find((p) => p.date === selectedDate && p.session === 'evening') : undefined;
  return <View style={styles.history}>
    <View style={styles.calendarHeader}>
      <Text style={styles.sectionTitle}>Punch history</Text>
      <View style={styles.monthNav}>
        <Pressable testID="previous-month" onPress={() => moveMonth(-1)} style={styles.monthButton}><Ionicons name="chevron-back" size={18} color={colors.ink} /></Pressable>
        <Pressable testID="month-year-picker" onPress={openPicker} style={styles.monthPicker}><Text style={styles.monthPickerText}>{monthName}</Text><Ionicons name="chevron-down" size={16} color={colors.blue} /></Pressable>
        <Pressable testID="next-month" onPress={() => moveMonth(1)} style={styles.monthButton}><Ionicons name="chevron-forward" size={18} color={colors.ink} /></Pressable>
      </View>
    </View>
    <View style={styles.weekHeader}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>)}</View>
    <View style={styles.calendarGrid}>{cells}</View>
    <View style={styles.legend}><View style={styles.legendItem}><View style={[styles.calendarDot, { backgroundColor: colors.green }]} /><Text style={styles.legendText}>Morning</Text></View><View style={styles.legendItem}><View style={[styles.calendarDot, { backgroundColor: colors.blue }]} /><Text style={styles.legendText}>Evening</Text></View><Text style={styles.legendNote}>Tap any day to see exact punch times.</Text></View>
    {selectedDate && <View style={styles.dayDetail}><Text style={styles.dayDetailTitle}>{formatDate(selectedDate)}</Text><Text style={styles.dayDetailLine}><Text style={styles.dayDetailLabel}>Morning</Text>{selectedMorning ? `  ${formatTime(selectedMorning.punchedAt)}` : '  Not punched'}</Text><Text style={styles.dayDetailLine}><Text style={styles.dayDetailLabel}>Evening</Text>{selectedEvening ? `  ${formatTime(selectedEvening.punchedAt)}` : '  Not punched'}</Text></View>}
    <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
      <Pressable style={styles.modalShade} onPress={() => setPickerOpen(false)}>
        <Pressable style={styles.pickerCard} onPress={() => {}}>
          <View style={styles.modalTitleRow}><Text style={styles.modalTitle}>Jump to month</Text><Pressable testID="close-picker" onPress={() => setPickerOpen(false)}><Ionicons name="close" size={24} color={colors.ink} /></Pressable></View>
          <Text style={styles.pickerLabel}>YEAR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearRow}>
            {years.map((y) => <Pressable key={y} testID={`year-option-${y}`} onPress={() => setPickerYear(y)} style={[styles.yearChip, pickerYear === y && styles.yearChipActive]}><Text style={[styles.yearChipText, pickerYear === y && styles.yearChipTextActive]}>{y}</Text></Pressable>)}
          </ScrollView>
          <Text style={styles.pickerLabel}>MONTH</Text>
          <View style={styles.monthGrid}>
            {MONTHS_SHORT.map((label, index) => { const active = pickerYear === year && index === monthIndex; return <Pressable key={label} testID={`month-option-${index}`} onPress={() => chooseMonth(index)} style={[styles.monthChip, active && styles.monthChipActive]}><Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>{label}</Text></Pressable>; })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.bg }, content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 8 }, loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.bg }, muted: { color: colors.muted, fontSize: 14 }, topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, eyebrow: { fontSize: 11, letterSpacing: 1.6, color: colors.blue, fontWeight: '800' }, brand: { fontSize: 32, lineHeight: 40, fontWeight: '800', color: colors.ink, letterSpacing: -1 }, iconButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }, syncNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, marginBottom: 12 }, syncNoticeOk: { backgroundColor: '#F0FDF4' }, syncNoticeError: { backgroundColor: '#FEF2F2' }, syncText: { color: colors.muted, flex: 1, fontSize: 12, fontWeight: '700' }, dateText: { color: colors.ink, fontWeight: '600', fontSize: 15 }, tz: { backgroundColor: '#DBEAFE', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 }, tzText: { color: colors.blue, fontSize: 10, fontWeight: '800' }, hero: { backgroundColor: colors.ink, borderRadius: 24, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, heroLabel: { color: '#93C5FD', fontSize: 11, letterSpacing: 1.4, fontWeight: '800', marginBottom: 8 }, heroTitle: { color: colors.white, fontSize: 31, fontWeight: '800', marginBottom: 5 }, heroCopy: { color: '#CBD5E1', fontSize: 14, maxWidth: 245, lineHeight: 20 }, ring: { width: 86, height: 86, borderRadius: 43, borderWidth: 5, borderColor: colors.blue, alignItems: 'center', justifyContent: 'center' }, ringValue: { color: colors.white, fontSize: 22, fontWeight: '800' }, ringPercent: { fontSize: 12 }, ringLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 1 }, reminder: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 14, borderRadius: 14, backgroundColor: '#FEF3C7', marginBottom: 25 }, reminderText: { color: '#92400E', fontWeight: '700', fontSize: 13, flex: 1 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' }, sectionHint: { color: colors.muted, fontSize: 10, letterSpacing: 1, fontWeight: '800' }, card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 17, marginBottom: 12 }, cardDone: { borderColor: '#BBF7D0' }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, sessionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', textTransform: 'capitalize' }, cardSub: { color: colors.muted, fontSize: 13, marginTop: 3 }, statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5 }, dot: { width: 7, height: 7, borderRadius: 4 }, statusText: { fontSize: 11, fontWeight: '800' }, punchButton: { backgroundColor: colors.blue, minHeight: 48, borderRadius: 13, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, buttonBusy: { opacity: 0.6 }, punchText: { color: colors.white, fontSize: 15, fontWeight: '800' }, actionRow: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 14, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, exact: { color: colors.muted, fontSize: 11, flex: 1 }, actions: { flexDirection: 'row', gap: 17 }, action: { color: colors.blue, fontSize: 13, fontWeight: '800', paddingVertical: 6 }, stats: { flexDirection: 'row', gap: 10, marginVertical: 12 }, stat: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 13, minHeight: 105 }, statValue: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 8 }, statLabel: { color: colors.muted, fontSize: 11, marginTop: 2, lineHeight: 15 }, historyButton: { backgroundColor: '#EFF6FF', borderRadius: 14, minHeight: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }, historyText: { color: colors.blue, fontWeight: '800', fontSize: 14 }, history: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 10 }, calendarHeader: { gap: 14, marginBottom: 12 }, monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 4 }, monthButton: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, monthPicker: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 8, paddingVertical: 9 }, monthPickerText: { color: colors.ink, fontSize: 15, fontWeight: '800' }, weekHeader: { flexDirection: 'row', marginBottom: 6 }, weekDay: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '800' }, calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' }, calendarCell: { width: `${100 / 7}%`, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 10, marginBottom: 2 }, calendarComplete: { backgroundColor: '#F0FDF4' }, calendarSelected: { borderWidth: 2, borderColor: colors.blue }, calendarDay: { color: colors.ink, fontSize: 13, fontWeight: '700' }, calendarDots: { flexDirection: 'row', gap: 3, marginTop: 6 }, calendarDot: { width: 6, height: 6, borderRadius: 3 }, legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 10, paddingTop: 12 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, legendText: { color: colors.muted, fontSize: 11 }, legendNote: { color: colors.muted, fontSize: 11, width: '100%' }, dayDetail: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, marginTop: 12, gap: 6 }, dayDetailTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' }, dayDetailLine: { color: colors.muted, fontSize: 13 }, dayDetailLabel: { color: colors.ink, fontWeight: '800' }, footer: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 28 }, modalShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.42)' }, modal: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, gap: 10 }, pickerCard: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, gap: 12 }, pickerLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 4 }, yearRow: { gap: 8, paddingVertical: 2 }, yearChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', flexShrink: 0 }, yearChipActive: { backgroundColor: colors.ink }, yearChipText: { color: colors.ink, fontWeight: '800', fontSize: 14 }, yearChipTextActive: { color: colors.white }, monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, monthChip: { width: '30%', flexGrow: 1, minHeight: 46, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }, monthChipActive: { backgroundColor: colors.blue }, monthChipText: { color: colors.ink, fontWeight: '800', fontSize: 14 }, monthChipTextActive: { color: colors.white }, modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalTitle: { color: colors.ink, fontSize: 22, fontWeight: '800' }, modalCopy: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 8 }, inputLabel: { color: colors.ink, fontWeight: '800', fontSize: 13, marginTop: 4 }, input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink }, switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }, switchText: { color: colors.ink, fontWeight: '700' }, saveButton: { minHeight: 50, borderRadius: 13, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, deleteButton: { minHeight: 50, borderRadius: 13, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, saveText: { color: colors.white, fontWeight: '800', fontSize: 15 }, cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: colors.muted, fontWeight: '700' } });
