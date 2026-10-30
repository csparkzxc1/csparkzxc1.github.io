/**
 * Supabase project for the guardian link (see docs/GUARDIAN_SETUP.md). The
 * anon key is meant to ship in apps; row level security protects the data.
 * While these are empty the guardian feature stays hidden.
 */
export const GUARDIAN_CONFIG: { url: string; anonKey: string } = {
  url: 'https://wcusqmyicuuxrlhfcdad.supabase.co',
  anonKey: 'sb_publishable_xBwWQJajRldW3uLAv3DLbQ_5vnuxQme',
};

export function guardianAvailable(): boolean {
  return GUARDIAN_CONFIG.url !== '' && GUARDIAN_CONFIG.anonKey !== '';
}
