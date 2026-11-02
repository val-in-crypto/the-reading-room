import { narratorCatalog } from "./narrators";
import type { Voice } from "./types";

export type ProviderVoice = { voice_id: string; name: string; preview_url?: string; labels?: Record<string, string> };

/** Keep configured voices first, then fill the fourteen-place reading collection. */
export function selectNarrators(available: ProviderVoice[], configured: string[] = []): Voice[] {
  const ids = [...new Set([...configured, ...narratorCatalog.map(voice => voice.id)])];
  const selected = ids.map(id => available.find(voice => voice.voice_id === id)).filter((voice): voice is ProviderVoice => !!voice).slice(0, 14);
  return (selected.length ? selected : available.slice(0, 14)).map(voice => {
    const curated = narratorCatalog.find(item => item.id === voice.voice_id);
    const accent = voice.labels?.accent?.replace(/\b\w/g, letter => letter.toUpperCase());
    return {
      id: voice.voice_id,
      name: curated?.name || voice.name.split(/\s+[-–—]\s+/)[0].trim() || voice.name,
      description: curated?.description || [accent, voice.labels?.description].filter(Boolean).join(" · ") || "Narrator",
      previewUrl: voice.preview_url?.startsWith("https://") ? voice.preview_url : curated?.previewUrl,
    };
  });
}
