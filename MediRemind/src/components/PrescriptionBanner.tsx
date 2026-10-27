import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Medicine } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { daysUntilPrescriptionEnd, prescriptionDDayLabel } from '../lib/prescription';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/theme';

interface Props {
  /** Already filtered to active medicines whose prescription ends within 7 days. */
  medicines: Medicine[];
  onPressMedicine: (medicineId: string) => void;
}

export default function PrescriptionBanner({ medicines, onPressMedicine }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (medicines.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="alert-circle" size={18} color={colors.warning} />
        <Text style={styles.headerText}>{t('presc.bannerTitle')}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {medicines.map((med) => {
          const urgent = daysUntilPrescriptionEnd(med.prescription!) <= 3;
          const accent = urgent ? colors.danger : colors.warning;
          return (
            <TouchableOpacity
              key={med.id}
              style={[styles.badge, { borderColor: accent }]}
              onPress={() => onPressMedicine(med.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.dot, { backgroundColor: med.color }]} />
              <Text style={styles.badgeName} numberOfLines={1}>
                {med.name}
              </Text>
              <Text style={[styles.badgeDday, { color: accent }]}>
                {prescriptionDDayLabel(med.prescription!)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.warningSoft,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: c.warning,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
    headerText: { fontSize: 14, fontWeight: '700', color: c.warningText },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 20,
      borderWidth: 1.5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      gap: 6,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    badgeName: { fontSize: 13, fontWeight: '600', color: c.text, maxWidth: 100 },
    badgeDday: { fontSize: 13, fontWeight: '700' },
  });
