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

  const ddayColor = expired ? '#D9534F' : expiringSoon ? '#F0AD4E' : '#5CB85C';

  return (
    <TouchableOpacity
      style={[styles.card, !medicine.isActive && styles.cardInactive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.colorDot, { backgroundColor: medicine.color }]} />
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
        trackColor={{ false: '#CCC', true: '#4A90D9' }}
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
    borderRadius: 12,
    marginVertical: 6,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 80,
  },
  cardInactive: {
    opacity: 0.6,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
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
    color: '#222',
    flex: 1,
  },
  nameInactive: {
    color: '#AAA',
  },
  ddayBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
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
    color: '#D9534F',
    fontWeight: '500',
  },
});
