import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { Medicine } from '../types';
import { daysLabel, formatTime } from '../i18n/core';
import { useI18n } from '../i18n/I18nProvider';
import {
  isPrescriptionExpired,
  isPrescriptionExpiringSoon,
  prescriptionDDayLabel,
} from '../lib/prescription';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { cardShadow, type Scheme, type ThemeColors } from '../theme/theme';

interface MedicineCardProps {
  medicine: Medicine;
  onPress: () => void;
  onToggleActive: () => void;
}

export default function MedicineCard({ medicine, onPress, onToggleActive }: MedicineCardProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const p = medicine.prescription;
  const dday = p ? prescriptionDDayLabel(p) : null;
  const expired = p ? isPrescriptionExpired(p) : false;
  const soon = p ? isPrescriptionExpiringSoon(p, 7) : false;
  const ddayColor = expired ? colors.danger : soon ? colors.warning : colors.success;

  return (
    <TouchableOpacity
      style={[styles.card, !medicine.isActive && styles.cardInactive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.iconBox, { backgroundColor: medicine.color + '24' }]}>
        <MaterialCommunityIcons name="pill" size={22} color={medicine.color} />
      </View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, !medicine.isActive && styles.nameInactive]} numberOfLines={1}>
            {medicine.name}
          </Text>
          {dday && (
            <View style={[styles.ddayBadge, { backgroundColor: ddayColor }]}>
              <Text style={styles.ddayText}>{dday}</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.meta} numberOfLines={2}>
            {' '}
            {medicine.times.map(formatTime).join(', ')}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
          <Text style={styles.meta}> {daysLabel(medicine.days)}</Text>
          <Text style={styles.metaDot}>  ·  </Text>
          <Text style={styles.meta}>{medicine.dosage}</Text>
        </View>
        {expired && <Text style={styles.expiredLabel}>{t('presc.expired')}</Text>}
      </View>
      <Switch
        value={medicine.isActive}
        onValueChange={onToggleActive}
        trackColor={{ false: colors.surfaceMuted, true: colors.brand }}
        thumbColor="#FFFFFF"
      />
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors, scheme: Scheme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 16,
      minHeight: 84,
      ...cardShadow(c, scheme),
    },
    cardInactive: { opacity: 0.55 },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    body: { flex: 1, marginRight: 10 },
    nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
    name: { fontSize: 16, fontWeight: '700', color: c.text, flexShrink: 1, letterSpacing: -0.2 },
    nameInactive: { color: c.textFaint },
    ddayBadge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 },
    ddayText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    meta: { fontSize: 13, color: c.textMuted, flexShrink: 1 },
    metaDot: { color: c.line, fontSize: 13 },
    expiredLabel: { marginTop: 6, fontSize: 12, color: c.danger, fontWeight: '500' },
  });
