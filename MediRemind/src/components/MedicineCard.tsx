import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Medicine } from '../types';
import { formatTimeDisplay, daysLabel } from '../utils/dateUtils';
import {
  prescriptionDDayLabel,
  isPrescriptionExpired,
  isPrescriptionExpiringSoon,
} from '../utils/prescriptionUtils';

interface MedicineCardProps {
  medicine: Medicine;
  onPress: () => void;
  onToggleActive: () => void;
}

export default function MedicineCard({
  medicine,
  onPress,
  onToggleActive,
}: MedicineCardProps) {
  const dday =
    medicine.prescription ? prescriptionDDayLabel(medicine.prescription) : null;
  const expired = medicine.prescription
    ? isPrescriptionExpired(medicine.prescription)
    : false;
  const expiringSoon = medicine.prescription
    ? isPrescriptionExpiringSoon(medicine.prescription, 7)
    : false;

  const ddayColor = expired ? '#EF4444' : expiringSoon ? '#F59E0B' : '#10B981';

  return (
    <TouchableOpacity
      style={[styles.card, !medicine.isActive && styles.cardInactive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.iconBox, { backgroundColor: medicine.color + '1F' }]}>
        <Ionicons name="medical" size={20} color={medicine.color} />
      </View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, !medicine.isActive && styles.nameInactive]}
            numberOfLines={1}
          >
            {medicine.name}
          </Text>
          {dday && (
            <View style={[styles.ddayBadge, { backgroundColor: ddayColor }]}>
              <Text style={styles.ddayText}>{dday}</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color="#888" />
          <Text style={styles.meta}>
            {' '}
            {medicine.times.map(formatTimeDisplay).join(', ')}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color="#888" />
          <Text style={styles.meta}> {daysLabel(medicine.days)}</Text>
          <Text style={styles.metaDot}>  ·  </Text>
          <Text style={styles.meta}>{medicine.dosage}</Text>
        </View>
        {expired && (
          <Text style={styles.expiredLabel}>⚠️ 재처방 기간이 만료되었습니다</Text>
        )}
      </View>
      <Switch
        value={medicine.isActive}
        onValueChange={onToggleActive}
        trackColor={{ false: '#CCC', true: '#4A6CF7' }}
        thumbColor="#FFFFFF"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginVertical: 6,
    padding: 16,
    shadowColor: '#3F4A7E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    minHeight: 84,
  },
  cardInactive: {
    opacity: 0.55,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D2B',
    flex: 1,
    letterSpacing: -0.2,
  },
  nameInactive: {
    color: '#A9B0C5',
  },
  ddayBadge: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  ddayText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  meta: {
    fontSize: 13,
    color: '#777',
  },
  metaDot: {
    color: '#CCC',
    fontSize: 13,
  },
  expiredLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
});
