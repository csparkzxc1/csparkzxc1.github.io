import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { kvGet, kvSet, KV_KEYS } from '../db/kv';
import {
  t as coreT,
  resolvePref,
  setActiveLanguage,
  type Language,
  type LanguagePref,
} from './core';

interface I18nContextValue {
  pref: LanguagePref;
  language: Language;
  setLanguage: (pref: LanguagePref) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isPref(v: unknown): v is LanguagePref {
  return v === 'system' || v === 'ko' || v === 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPref] = useState<LanguagePref>('system');
  const [language, setLanguageState] = useState<Language>(() => {
    const lang = resolvePref('system');
    setActiveLanguage(lang);
    return lang;
  });

  useEffect(() => {
    let active = true;
    kvGet(KV_KEYS.language)
      .then((v) => {
        if (!active || !isPref(v)) return;
        const lang = resolvePref(v);
        setActiveLanguage(lang);
        setPref(v);
        setLanguageState(lang);
      })
      .catch((e) => console.warn('[i18n] load failed', e));
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      pref,
      language,
      setLanguage: (next) => {
        const lang = resolvePref(next);
        setActiveLanguage(lang);
        setPref(next);
        setLanguageState(lang);
        kvSet(KV_KEYS.language, next).catch((e) => console.warn('[i18n] save failed', e));
      },
      // Recreated per language so memoized consumers re-render on a switch.
      t: (key, params) => coreT(key, params),
    }),
    [pref, language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
