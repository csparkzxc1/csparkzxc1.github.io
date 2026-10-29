import { describe, expect, it } from '@jest/globals';
import { STRINGS } from './strings';
import { LOCALES } from './locales';
import { formatLongDate, formatShortDate, formatTime, matchLanguage, setActiveLanguage, t } from './core';

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe('locales', () => {
  const keys = Object.keys(STRINGS).sort();

  it.each(Object.entries(LOCALES))('%s has every key with matching placeholders', (_lang, table) => {
    expect(Object.keys(table!).sort()).toEqual(keys);
    for (const key of keys) {
      expect([key, placeholders(table![key])]).toEqual([key, placeholders(STRINGS[key].en)]);
    }
  });

  it('registers all six extra languages', () => {
    expect(Object.keys(LOCALES).sort()).toEqual(['de', 'es', 'fr', 'ja', 'zh-Hans', 'zh-Hant']);
  });
});

describe('matchLanguage', () => {
  it('maps device locales', () => {
    expect(matchLanguage('ko-KR')).toBe('ko');
    expect(matchLanguage('ja-JP')).toBe('ja');
    expect(matchLanguage('zh-Hans-CN')).toBe('zh-Hans');
    expect(matchLanguage('zh-CN')).toBe('zh-Hans');
    expect(matchLanguage('zh-Hant-TW')).toBe('zh-Hant');
    expect(matchLanguage('zh-TW')).toBe('zh-Hant');
    expect(matchLanguage('zh_HK')).toBe('zh-Hant');
    expect(matchLanguage('es-419')).toBe('es');
    expect(matchLanguage('fr-CA')).toBe('fr');
    expect(matchLanguage('de-DE')).toBe('de');
    expect(matchLanguage('pt-BR')).toBeNull();
  });
});

describe('formatting', () => {
  const d = new Date(2026, 6, 6); // Monday, July 6

  it('formats per language', () => {
    setActiveLanguage('ja');
    expect(formatTime('08:05')).toBe('午前8:05');
    expect(formatLongDate(d)).toBe('7月6日 月曜日');
    expect(formatShortDate('2026-07-06')).toBe('2026年7月6日');
    setActiveLanguage('es');
    expect(formatTime('20:30')).toBe('20:30');
    expect(formatLongDate(d)).toBe('lunes, 6 de julio');
    setActiveLanguage('fr');
    expect(formatLongDate(d)).toBe('lundi 6 juillet');
    expect(formatShortDate('2026-07-06')).toBe('6 juil. 2026');
    setActiveLanguage('de');
    expect(formatTime('08:05')).toBe('08:05');
    expect(formatLongDate(d)).toBe('Montag, 6. Juli');
    expect(formatShortDate('2026-07-06')).toBe('6. Juli 2026');
    setActiveLanguage('zh-Hant');
    expect(formatTime('13:00')).toBe('下午1:00');
    setActiveLanguage('ko');
    expect(formatTime('13:00')).toBe('오후 1:00');
  });

  it('falls back to English for a missing key', () => {
    setActiveLanguage('fr');
    expect(t('no.such.key')).toBe('no.such.key');
    setActiveLanguage('en');
  });
});
