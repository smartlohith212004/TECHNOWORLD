import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type Session = 'morning' | 'evening';
export type Punch = { id: string; date: string; session: Session; punchedAt: string };
export type Settings = { morningTime: string; eveningTime: string; notifications: boolean };

const PUNCHES_KEY = 'pulse.punches.v1';
const SETTINGS_KEY = 'pulse.settings.v1';

async function localPunches() { return JSON.parse((await AsyncStorage.getItem(PUNCHES_KEY)) || '[]') as Punch[]; }
function mapRemote(row: any): Punch { return { id: row.id, date: row.punch_date, session: row.session, punchedAt: row.punched_at }; }

export async function getPunches() {
  const local = await localPunches();
  try {
    if (!supabase) throw new Error('offline');
    const { data, error } = await supabase.from('punch_records').select('id,punch_date,session,punched_at').order('punched_at', { ascending: false });
    if (error) throw error;
    const remote = (data || []).map(mapRemote);
    const keys = new Set(remote.map((item) => `${item.date}-${item.session}`));
    return [...remote, ...local.filter((item) => !keys.has(`${item.date}-${item.session}`))];
  } catch { return local; }
}

export async function savePunch(session: Session, date: string, punchedAt: string) {
  const current = await localPunches();
  const existing = current.find((p) => p.date === date && p.session === session);
  const punch: Punch = { id: existing?.id || `${date}-${session}`, date, session, punchedAt };
  const next = [punch, ...current.filter((p) => p.id !== punch.id)];
  await AsyncStorage.setItem(PUNCHES_KEY, JSON.stringify(next));
  try {
    if (!supabase) throw new Error('offline');
    if (existing) await supabase.from('punch_records').update({ punched_at: punchedAt }).eq('id', existing.id);
    else await supabase.from('punch_records').insert({ demo_id: 'personal-demo', punch_date: date, session, punched_at: punchedAt });
  } catch { /* local persistence keeps the flow usable until schema is present */ }
  return punch;
}

export async function deletePunch(id: string) {
  await AsyncStorage.setItem(PUNCHES_KEY, JSON.stringify((await localPunches()).filter((p) => p.id !== id)));
  try { if (supabase) await supabase.from('punch_records').delete().eq('id', id); } catch { /* offline */ }
}

export async function getSettings(): Promise<Settings> {
  const saved = await AsyncStorage.getItem(SETTINGS_KEY);
  return saved ? JSON.parse(saved) : { morningTime: '09:30', eveningTime: '19:00', notifications: true };
}
export async function saveSettings(settings: Settings) {
  const valid = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const safe = { ...settings, morningTime: valid(settings.morningTime) ? settings.morningTime : '09:30', eveningTime: valid(settings.eveningTime) ? settings.eveningTime : '19:00' };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(safe));
  return safe;
}