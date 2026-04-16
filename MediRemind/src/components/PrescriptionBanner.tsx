import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Medicine } from '../types';
import {
  prescriptionDDayLabel,
  getDaysUntilPrescriptionEnd,
} from '../utils/prescriptionUtils';

interface PrescriptionBannerProps {
  medicines: Medicine[];
  onPressMedicine: (medicineId: string) => void;
}

export default function PrescriptionBanner({
  medicines,
  onPressMedicine,
}: PrescriptionBannerProps) {
  const expiring = medicines.filter(
    (m) =>
      m.prescription &&
      m.isActive &&
      getDaysUntilPrescriptionEnd(m.prescription) >= 0 &&
      getDaysUntilPrescriptionEnd(m.prescription) <= 7
  );

  if (expiring.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="alert-circle" size={18} color="#F0AD4E" />
        <Text style={styles.headerText}>재처방 임박 알림</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
      >
        {expiring.map((med) => {
          const daysLeft = getDaysUntilPrescriptionEnd(med.prescription!);
          const isUrgent = daysLeft <= 3;
          return (
            <TouchableOpacity
              key={med.id}
              style={[
                styles.badge,
                { borderColor: isUrgent ? '#D9534F' : '#F0AD4E' },
              ]}
              onPress={() => onPressMedicine(med.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.dot, { backgroundColor: med.color }]} />
              <Text style={styles.badgeName} numberOfLines={1}>
                {med.name}
              </Text>
              <Text
                style={[
                  styles.badgeDday,
                  { color: isUrgent ? '#D9534F' : '#F0AD4E' },
                ]}
              >
                {prescriptionDDayLabel(med.prescription!)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF9EF',
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F0AD4E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7D5A00',
  },
  scroll: {
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    maxWidth: 80,
  },
  badgeDday: {
    fontSize: 13,
    fontWeight: '700',
  },
});
