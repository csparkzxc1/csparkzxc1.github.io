import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DoseRecord, Medicine } from '../types';
import { formatTimeDisplay } from '../utils/dateUtils';

interface DoseItemProps {
  record: DoseRecord;
  medicine: Medicine | undefined;
  onToggle: (record: DoseRecord) => void;
}

export default function DoseItem({ record, medicine, onToggle }: DoseItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const strikeAnim = useRef(new Animated.Value(record.isTaken ? 1 : 0)).current;

  const handleToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();

    Animated.timing(strikeAnim, {
      toValue: record.isTaken ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();

    onToggle(record);
  };

  const medicineColor = medicine?.color ?? '#4A6CF7';
  const timeLabel = formatTimeDisplay(record.scheduledTime);
  const offset = medicine?.notificationOffset ?? 0;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.colorBar, { backgroundColor: medicineColor }]} />
      <View style={styles.info}>
        <Text
          style={[
            styles.name,
            record.isTaken && styles.nameStrike,
          ]}
          numberOfLines={1}
        >
          {medicine?.name ?? '알 수 없는 약'}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color="#888" />
          <Text style={styles.meta}> {timeLabel}</Text>
          <Text style={styles.metaDot}>  ·  </Text>
          <Text style={styles.meta}>{medicine?.dosage ?? ''}</Text>
          {offset > 0 && (
            <>
              <Text style={styles.metaDot}>  ·  </Text>
              <Ionicons name="notifications-outline" size={12} color="#4A6CF7" />
              <Text style={[styles.meta, { color: '#4A6CF7' }]}> {offset}분 전</Text>
            </>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.checkBtn, record.isTaken && styles.checkBtnDone]}
        onPress={handleToggle}
        activeOpacity={0.7}
        accessibilityLabel={record.isTaken ? '복용 취소' : '복용 완료'}
      >
        <Ionicons
          name="checkmark"
          size={26}
          color={record.isTaken ? '#FFFFFF' : '#C4CBDD'}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginVertical: 6,
    overflow: 'hidden',
    shadowColor: '#3F4A7E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    minHeight: 76,
  },
  colorBar: {
    width: 5,
    alignSelf: 'stretch',
  },
  info: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D2B',
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  nameStrike: {
    textDecorationLine: 'line-through',
    color: '#A9B0C5',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: 13,
    color: '#8A91A8',
  },
  metaDot: {
    color: '#D4D9E6',
    fontSize: 13,
  },
  checkBtn: {
    marginRight: 16,
    backgroundColor: '#F1F3F9',
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E3E7F1',
  },
  checkBtnDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
