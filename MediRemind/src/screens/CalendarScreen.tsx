import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

import { useDoseStore } from '../store/doseStore';
import { useMedicineStore } from '../store/medicineStore';
import { showCalendarInterstitial } from '../services/adService';
import { formatTimeDisplay } from '../utils/dateUtils';

interface MarkedDates {
  [date: string]: {
    dots?: { color: string; key: string }[];
    selected?: boolean;
    selectedColor?: string;
    marked?: boolean;
  };
}

export default function CalendarScreen() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(today.slice(0, 7));
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [monthlyRate, setMonthlyRate] = useState<number | null>(null);

  const { rangeRecords, doseRecords, loadDoseRecordsRange, loadDoseRecords } =
    useDoseStore();
  const { getMedicineById } = useMedicineStore();

  // ─── Show interstitial on tab focus ─────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      showCalendarInterstitial();
    }, [])
  );

  // ─── Load month data ─────────────────────────────────────────────────────
  useEffect(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    loadDoseRecordsRange(start, end);
  }, [currentMonth]);

  // ─── Load selected day ────────────────────────────────────────────────────
  useEffect(() => {
    loadDoseRecords(selectedDate);
  }, [selectedDate]);

  // ─── Build marked dates ───────────────────────────────────────────────────
  useEffect(() => {
    const dateMap: {
      [date: string]: { hasTaken: boolean; hasMissed: boolean };
    } = {};

    for (const rec of rangeRecords) {
      if (!dateMap[rec.date]) {
        dateMap[rec.date] = { hasTaken: false, hasMissed: false };
      }
      if (rec.isTaken) {
        dateMap[rec.date].hasTaken = true;
      } else {
        // Only mark as missed if the date is in the past
        if (rec.date < today) {
          dateMap[rec.date].hasMissed = true;
        }
      }
    }

    // Compute monthly adherence rate
    const completeDays = Object.entries(dateMap).filter(
      ([date, v]) => date <= today && v.hasTaken && !v.hasMissed
    ).length;
    const totalDays = Object.keys(dateMap).filter((d) => d <= today).length;
    setMonthlyRate(totalDays > 0 ? Math.round((completeDays / totalDays) * 100) : null);

    const marks: MarkedDates = {};
    for (const [date, status] of Object.entries(dateMap)) {
      const dots: { color: string; key: string }[] = [];
      if (status.hasTaken) dots.push({ color: '#5CB85C', key: 'taken' });
      if (status.hasMissed) dots.push({ color: '#D9534F', key: 'missed' });
      marks[date] = { dots, marked: dots.length > 0 };
    }

    // Highlight selected date
    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: '#4A90D9',
    };

    setMarkedDates(marks);
  }, [rangeRecords, selectedDate, today]);

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const handleMonthChange = (month: DateData) => {
    setCurrentMonth(`${String(month.year).padStart(4, '0')}-${String(month.month).padStart(2, '0')}`);
  };

  const selectedRecords = doseRecords.filter((r) => r.date === selectedDate);
  const selectedSorted = [...selectedRecords].sort((a, b) =>
    a.scheduledTime.localeCompare(b.scheduledTime)
  );

  const isToday = selectedDate === today;
  const isFuture = selectedDate > today;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>복용 기록</Text>
        {monthlyRate !== null && (
          <View style={styles.rateBadge}>
            <Text style={styles.rateText}>이번 달 {monthlyRate}%</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky Calendar */}
        <View style={styles.calendarWrapper}>
          <Calendar
            current={currentMonth + '-01'}
            onDayPress={handleDayPress}
            onMonthChange={handleMonthChange}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={{
              backgroundColor: '#FFFFFF',
              calendarBackground: '#FFFFFF',
              selectedDayBackgroundColor: '#4A90D9',
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: '#4A90D9',
              dayTextColor: '#333',
              textDisabledColor: '#CCC',
              monthTextColor: '#222',
              arrowColor: '#4A90D9',
              textMonthFontWeight: '700',
              textDayFontSize: 14,
              textMonthFontSize: 16,
            }}
            style={styles.calendar}
          />
        </View>

        {/* Day Detail */}
        <View style={styles.detail}>
          <Text style={styles.detailTitle}>
            {selectedDate === today
              ? '오늘'
              : selectedDate}{' '}
            {isFuture ? '(예정)' : ''}
          </Text>

          {isFuture ? (
            <Text style={styles.futureMsg}>아직 복용 기록이 없어요.</Text>
          ) : selectedSorted.length === 0 ? (
            <View style={styles.emptyDetail}>
              <Text style={styles.emptyDetailText}>이 날의 복용 기록이 없어요.</Text>
            </View>
          ) : (
            selectedSorted.map((record) => {
              const medicine = getMedicineById(record.medicineId);
              return (
                <View
                  key={record.id}
                  style={[
                    styles.recordRow,
                    record.isTaken ? styles.recordTaken : styles.recordMissed,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: record.isTaken ? '#5CB85C' : '#D9534F' },
                    ]}
                  />
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordName}>
                      {medicine?.name ?? '알 수 없는 약'}
                    </Text>
                    <Text style={styles.recordTime}>
                      {formatTimeDisplay(record.scheduledTime)} ·{' '}
                      {medicine?.dosage ?? ''}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.recordStatus,
                      { color: record.isTaken ? '#5CB85C' : '#D9534F' },
                    ]}
                  >
                    {record.isTaken ? '복용' : '미복용'}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4A90D9',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
  },
  rateBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  rateText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  calendarWrapper: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detail: {
    padding: 16,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  futureMsg: {
    color: '#AAA',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyDetail: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyDetailText: {
    color: '#BBB',
    fontSize: 14,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  recordTaken: {
    borderLeftWidth: 4,
    borderLeftColor: '#5CB85C',
  },
  recordMissed: {
    borderLeftWidth: 4,
    borderLeftColor: '#D9534F',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  recordTime: {
    fontSize: 13,
    color: '#888',
  },
  recordStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
});
