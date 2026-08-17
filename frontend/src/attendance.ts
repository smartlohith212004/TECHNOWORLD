import { supabase } from './supabase';

export type Session = 'morning' | 'evening';
export type Punch = { id: string; date: string; session: Session; punchedAt: string };
export type Settings = { morningTime: string; eveningTime: string; notifications: boolean };

const DEMO_ID = 'personal-demo';
const DEFAULT_SETTINGS: Settings = { morningTime: '09:30', eveningTime: '19:00', notifications: true };

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured. Add your project URL and anon key.');
  return supabase;
}

function mapRemote(row: any): Punch {
  return { id: row.id, date: row.punch_date, session: row.session, punchedAt: row.punched_at };
}

// ---- Punches (Supabase only) ----
export async function getPunches(): Promise<Punch[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('punch_records')
    .select('id,punch_date,session,punched_at')
    .eq('demo_id', DEMO_ID)
    .order('punch_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapRemote);
}

export async function savePunch(session: Session, date: string, punchedAt: string): Promise<Punch> {
  const client = requireClient();
  const { data, error } = await client
    .from('punch_records')
    .upsert({ demo_id: DEMO_ID, punch_date: date, session, punched_at: punchedAt }, { onConflict: 'demo_id,punch_date,session' })
    .select('id,punch_date,session,punched_at')
    .single();
  if (error) throw new Error(error.message);
  return mapRemote(data);
}

export async function deletePunch(item: Punch): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('punch_records')
    .delete()
    .eq('demo_id', DEMO_ID)
    .eq('punch_date', item.date)
    .eq('session', item.session);
  if (error) throw new Error(error.message);
}

// ---- Reminder settings (Supabase only) ----
export async function getSettings(): Promise<Settings> {
  if (!supabase) return DEFAULT_SETTINGS;
  const { data, error } = await supabase
    .from('reminder_settings')
    .select('morning_time,evening_time,notifications')
    .eq('demo_id', DEMO_ID)
    .maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return {
    morningTime: (data.morning_time || DEFAULT_SETTINGS.morningTime).slice(0, 5),
    eveningTime: (data.evening_time || DEFAULT_SETTINGS.eveningTime).slice(0, 5),
    notifications: !!data.notifications,
  };
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const client = requireClient();
  const valid = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const safe: Settings = {
    morningTime: valid(settings.morningTime) ? settings.morningTime : DEFAULT_SETTINGS.morningTime,
    eveningTime: valid(settings.eveningTime) ? settings.eveningTime : DEFAULT_SETTINGS.eveningTime,
    notifications: settings.notifications,
  };
  const { error } = await client
    .from('reminder_settings')
    .upsert({
      demo_id: DEMO_ID,
      morning_time: safe.morningTime,
      evening_time: safe.eveningTime,
      notifications: safe.notifications,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'demo_id' });
  if (error) throw new Error(error.message);
  return safe;
}
