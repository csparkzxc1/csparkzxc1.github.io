/**
 * My adherence report, shown on the back of the calendar card: overall rate,
 * one bar per day, and each medicine's rate. Tapping a day opens it on the
 * calendar.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import type { DoseRecord } from '../types';
import { getDoseRecordsByDateRange } from '../db/doseRepository';
import { useMedicineStore } from '../store/medicineStore';
import { useI18n } from '../i18n/I18nProvider';
import { formatShortDate } from '../i18n/core';
import { addDays } from '../lib/schedule';
import { medicineRates, recordTally } from '../lib/report';
import { adherenceRate } from '../guardian/slots';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/theme';

const PERIODS = [14, 30] as const;

export default function AdherenceReport({ today, onPickDay }: { today: string; onPickDay: (date: string) => void }) {
  const { t } = useI18n();
  const { colors, textScale } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const medicines = useMedicineStore((s) => s.medicines);
  const [days, setDays] = useState<(typeof PERIODS)[number]>(14);
  const [records, setRecords] = useState<DoseRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      getDoseRecordsByDateRange(addDays(today, -(PERIODS[1] - 1)), today)
        .then(setRecords)
        .catch((e) => console.warn('[report] load failed', e));
    }, [today])
  );

  const now = new Date();
  const tally = recordTally(records, today, now, days);
  const rate = adherenceRate(tally);
  const perMedicine = medicineRates(records, medicines, today, now, days);
  const max = Math.max(1, ...tally.map((d) => d.total));
  const tone = (n: number) => (n >= 80 ? colors.success : n >= 50 ? colors.warning : colors.danger);
  const taken = tally.reduce((n, d) => n + d.taken, 0);
  const due = tally.reduce((n, d) => n + d.taken + d.missed, 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.periods}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.period, days === p && styles.periodOn]}
            onPress={() => setDays(p)}
            accessibilityRole="button"
            accessibilityState={{ selected: days === p }}
          >
            <Text style={[styles.periodText, days === p && styles.periodTextOn]}>
              {t('report.days', { n: p })}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {rate === null ? (
        <Text style={styles.empty}>{t('report.empty')}</Text>
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={[styles.rate, { color: tone(rate) }]}>
              {rate}
              <Text style={styles.rateUnit}>%</Text>
            </Text>
            <View>
              <Text style={styles.rateLabel}>{t('report.rate')}</Text>
              <Text style={styles.count}>{t('report.count', { taken, due })}</Text>
            </View>
          </View>

          <View style={[styles.bars, days === 30 && styles.barsTight]}>
            {tally.map((d, i) => (
              <TouchableOpacity
                key={d.date}
                style={styles.barCol}
                disabled={d.total === 0}
                onPress={() => onPickDay(d.date)}
                accessibilityLabel={`${formatShortDate(d.date)} ${d.taken}/${d.total}`}
              >
                <View style={styles.barTrack}>
                  {d.total > 0 && (
                    <View style={{ height: `${(d.total / max) * 100}%`, width: '100%' }}>
                      <View style={{ flex: d.total - d.taken - d.missed, backgroundColor: colors.surfaceMuted }} />
                      <View style={{ flex: d.missed, backgroundColor: colors.danger }} />
                      <View style={{ flex: d.taken, backgroundColor: colors.success }} />
                    </View>
                  )}
                </View>
                {(i === tally.length - 1 ||
                  (days === 14 ? textScale <= 1.2 || i % 2 === 1 : i % (textScale > 1.2 ? 10 : 5) === 4)) && (
                  <Text numberOfLines={1} style={[styles.barDay, i === tally.length - 1 && styles.barToday]}>
                    {Number(d.date.slice(8))}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>{t('dose.taken')}</Text>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <Text style={styles.legendText}>{t('dose.missed')}</Text>
            <Text style={styles.hint}>{t('report.tapDay')}</Text>
          </View>

          {perMedicine.length > 0 && (
            <View style={styles.medicines}>
              <Text style={styles.sectionTitle}>{t('report.byMedicine')}</Text>
              {perMedicine.map((m) => (
                <View key={m.id} style={styles.medRow}>
                  <View style={[styles.dot, { backgroundColor: m.color, marginLeft: 0 }]} />
                  <Text style={styles.medName} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <View style={styles.medTrack}>
                    <View
                      style={[
                        styles.medFill,
                        { width: `${m.rate ?? 0}%`, backgroundColor: m.rate === null ? colors.line : tone(m.rate) },
                      ]}
                    />
                  </View>
                  <Text numberOfLines={1} style={styles.medRate}>
                    {m.rate === null ? '—' : `${m.rate}%`}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { padding: 16, gap: 14 },
    periods: { flexDirection: 'row', backgroundColor: c.surfaceMuted, borderRadius: 12, padding: 3, alignSelf: 'flex-start' },
    period: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 10 },
    periodOn: { backgroundColor: c.surface },
    periodText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    periodTextOn: { color: c.text },
    empty: { fontSize: 14, color: c.textMuted, paddingVertical: 24, textAlign: 'center' },
    summary: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    rate: { fontSize: 44, fontWeight: '800', letterSpacing: -1, flexShrink: 0 },
    rateUnit: { fontSize: 20 },
    rateLabel: { fontSize: 13, fontWeight: '700', color: c.text },
    count: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    bars: { flexDirection: 'row', gap: 4, height: 110, alignItems: 'flex-end' },
    barsTight: { gap: 2 },
    barCol: { flex: 1, height: '100%', alignItems: 'center', overflow: 'visible' },
    barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', borderRadius: 3, overflow: 'hidden' },
    barDay: { width: 30, textAlign: 'center', fontSize: 9, color: c.textFaint, marginTop: 3 },
    barToday: { color: c.brand, fontWeight: '800' },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
    legendText: { fontSize: 11, color: c.textMuted },
    hint: { fontSize: 11, color: c.textFaint, marginLeft: 'auto' },
    medicines: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: c.text },
    medRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    medName: { flexShrink: 1, maxWidth: '35%', minWidth: 60, fontSize: 13, color: c.text },
    medTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: c.surfaceMuted, overflow: 'hidden' },
    medFill: { height: '100%', borderRadius: 4 },
    medRate: { minWidth: 44, flexShrink: 0, textAlign: 'right', fontSize: 13, fontWeight: '700', color: c.text },
  });
