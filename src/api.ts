import { projectId, publicAnonKey } from '../utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-82d9e30e`;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
};

export async function fetchData<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}/data/${key}`, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as T;
  } catch {
    return null;
  }
}

export async function pushData(key: string, data: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/data/${key}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
