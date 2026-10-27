import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig, type DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';

import { useDoseStore } from '../store/doseStore';
import { useMedicineStore } from '../store/medicineStore';
import { useToday } from '../hooks/useToday';
import { useI18n } from '../i18n/I18nProvider';
import { formatShortDate, formatTime, weekdayLabels } from '../i18n/core';
import { dayStatuses } from '../lib/streak';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { cardShadow, type Scheme, type ThemeColors } from '../theme/theme';
import ScreenHeader from '../components/ScreenHeader';

type MarkedDates = Record<
  string,
  { dots?: { color: string; key: string }[]; selected?: boolean; selectedColor?: string }
>;

function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` };
}

export default function CalendarScreen() {
  const { t, language } = useI18n();
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const today = useToday();

  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));

  const { rangeRecords, streak, loadDoseRecordsRange } = useDoseStore();
  const getMedicineById = useMedicineStore((s) => s.getMedicineById);

  // Reload on every focus so doses marked on the home tab show up here.
  useFocusEffect(
    useCallback(() => {
      const { start, end } = monthBounds(month);
      loadDoseRecordsRange(start, end);
    }, [month, loadDoseRecordsRange])
  );

  const statuses = useMemo(
    () => dayStatuses(rangeRecords.filter((r) => r.date <= today)),
    [rangeRecords, today]
  );

  const monthlyRate = useMemo(() => {
    const days = [...statuses.values()];
    if (days.length === 0) return null;
    return Math.round((days.filter((s) => s === 'complete').length / days.length) * 100);
  }, [statuses]);

  const markedDates = useMemo<MarkedDates>(() => {
    const marks: MarkedDates = {};
    for (const [date, status] of statuses) {
      const dots =
        status === 'complete'
          ? [{ color: colors.success, key: 'taken' }]
          : status === 'partial'
            ? [
                { color: colors.success, key: 'taken' },
                { color: colors.danger, key: 'missed' },
              ]
            : [{ color: colors.danger, key: 'missed' }];
      // Today's untaken doses aren't missed yet.
      marks[date] = { dots: date === today && status !== 'complete' ? dots.slice(0, 1) : dots };
    }
    marks[selectedDate] = { ...(marks[selectedDate] ?? {}), selected: true, selectedColor: colors.brand };
    return marks;
  }, [statuses, selectedDate, colors, today]);

  const selectedRecords = useMemo(
    () =>
      rangeRecords
        .filter((r) => r.date === selectedDate)
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
    [rangeRecords, selectedDate]
  );

  const isFuture = selectedDate > today;
  const isToday = selectedDate === today;

  LocaleConfig.locales[language] = {
    monthNames: language === 'ko'
      ? ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthNamesShort: language === 'ko'
      ? ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    dayNames: weekdayLabels(),
    dayNamesShort: weekdayLabels(),
    today: t('cal.today'),
  };
  LocaleConfig.defaultLocale = language;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={t('cal.title')}
        right={
          monthlyRate !== null ? (
            <View style={styles.rateBadge}>
              <Text style={styles.rateText}>{t('cal.monthRate', { n: monthlyRate })}</Text>
            </View>
          ) : undefined
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.calendarCard}>
          <Calendar
            key={`${scheme}-${language}`}
            current={`${month}-01`}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            onMonthChange={(m: DateData) =>
              setMonth(`${m.year}-${String(m.month).padStart(2, '0')}`)
            }
            markedDates={markedDates}
            markingType="multi-dot"
            monthFormat={language === 'ko' ? 'yyyy년 M월' : 'MMMM yyyy'}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              selectedDayBackgroundColor: colors.brand,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: colors.brand,
              dayTextColor: colors.text,
              textDisabledColor: colors.textFaint,
              monthTextColor: colors.text,
              arrowColor: colors.brand,
              textSectionTitleColor: colors.textMuted,
              textMonthFontWeight: '700',
              textDayFontSize: 14,
              textMonthFontSize: 16,
            }}
          />
        </View>

        {streak > 0 && (
          <View style={styles.streakChip}>
            <Text style={styles.streakText}>{t('home.streak', { n: streak })}</Text>
          </View>
        )}

        <Text style={styles.detailTitle}>
          {isToday ? t('cal.today') : formatShortDate(selectedDate)} {isFuture ? t('cal.scheduled') : ''}
        </Text>

        {isFuture ? (
          <Text style={styles.emptyText}>{t('cal.future')}</Text>
        ) : selectedRecords.length === 0 ? (
          <Text style={styles.emptyText}>{t('cal.empty')}</Text>
        ) : (
          selectedRecords.map((record) => {
            const medicine = getMedicineById(record.medicineId);
            const pending = !record.isTaken && isToday;
            const accent = record.isTaken ? colors.success : pending ? colors.textFaint : colors.danger;
            return (
              <View key={record.id} style={[styles.recordRow, { borderLeftColor: accent }]}>
                <View style={[styles.statusDot, { backgroundColor: accent }]} />
                <View style={styles.recordInfo}>
                  <Text style={styles.recordName}>{medicine?.name ?? t('common.unknownMedicine')}</Text>
                  <Text style={styles.recordTime}>
                    {formatTime(record.scheduledTime)} · {medicine?.dosage ?? ''}
                  </Text>
                </View>
                <Text style={[styles.recordStatus, { color: accent }]}>
                  {record.isTaken ? t('dose.taken') : pending ? '—' : t('dose.missed')}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors, scheme: Scheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    rateBadge: { backgroundColor: c.brandSoft, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
    rateText: { color: c.brand, fontSize: 13, fontWeight: '800' },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },
    calendarCard: {
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 8,
      overflow: 'hidden',
      ...cardShadow(c, scheme),
    },
    streakChip: {
      alignSelf: 'flex-start',
      marginTop: 14,
      backgroundColor: c.warningSoft,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    streakText: { color: c.warningText, fontSize: 13, fontWeight: '800' },
    detailTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginTop: 18, marginBottom: 12 },
    emptyText: { color: c.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
    recordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderLeftWidth: 4,
    },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    recordInfo: { flex: 1 },
    recordName: { fontSize: 15, fontWeight: '600', color: c.text, marginBottom: 2 },
    recordTime: { fontSize: 13, color: c.textMuted },
    recordStatus: { fontSize: 13, fontWeight: '700' },
  });
