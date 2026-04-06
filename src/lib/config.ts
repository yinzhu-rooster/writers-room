import { createAdminClient } from '@/lib/supabase/admin';

const CONFIG_DEFAULTS: Record<string, string> = {
  min_reactions_for_reveal: '3',
  default_max_open_prompts: '2',
  default_pitch_cap_per_prompt: '50',
  default_prompt_duration_hours: '24',
};

export async function getConfigValue(key: string): Promise<string> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', key)
      .single();

    const value = data?.value ?? CONFIG_DEFAULTS[key];
    if (value === undefined) {
      console.warn(`Unknown config key "${key}" with no default`);
      return '';
    }
    return value;
  } catch {
    // Fall back to defaults if admin client is unavailable
    return CONFIG_DEFAULTS[key] ?? '';
  }
}

export async function getConfigInt(key: string): Promise<number> {
  const value = await getConfigValue(key);
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    console.warn(`Config key "${key}" has non-numeric value "${value}", using default`);
    const fallback = CONFIG_DEFAULTS[key];
    return fallback ? parseInt(fallback, 10) : 0;
  }
  return num;
}
