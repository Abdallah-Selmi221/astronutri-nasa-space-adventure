import type { AppLanguage, CadetAgeGroup } from '../types/game';

/** Pick localized text cleanly between Global English (default) and Arabic. */
export function tr(lang: AppLanguage | undefined, en: string, ar: string): string {
  return lang === 'ar' ? ar : en;
}

/** Adapt guidance / Robo briefing clarity cleanly by cadet age group (7-10, 11-14, 15+). */
export function adaptByAge(
  ageGroup: CadetAgeGroup | undefined,
  lang: AppLanguage | undefined,
  copy: {
    youngEn: string;
    youngAr: string;
    midEn: string;
    midAr: string;
    teenEn: string;
    teenAr: string;
  }
): string {
  const age = ageGroup || '7-10';
  if (age === '15+') return tr(lang, copy.teenEn, copy.teenAr);
  if (age === '11-14') return tr(lang, copy.midEn, copy.midAr);
  return tr(lang, copy.youngEn, copy.youngAr);
}

/** Speak text via non-blocking Web Speech API fallback in current language if Gemini audio is not used. */
export function speakWebSpeechNonBlocking(text: string, lang: AppLanguage): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === 'ar' ? 'ar-EG' : 'en-US';
    utter.rate = lang === 'ar' ? 0.98 : 1.02;
    utter.pitch = 1.08;
    synth.speak(utter);
  } catch {
    // Non-blocking fallback: ignore speech errors on restricted devices
  }
}
