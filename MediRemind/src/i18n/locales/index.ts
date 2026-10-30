/** Translations beyond the Korean/English kept inline in ../strings.ts. */
import type { Language } from '../strings';
import de from './de';
import es from './es';
import fr from './fr';
import ja from './ja';
import zhHans from './zh-Hans';
import zhHant from './zh-Hant';

export const LOCALES: Partial<Record<Language, Record<string, string>>> = {
  ja,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  es,
  fr,
  de,
};
