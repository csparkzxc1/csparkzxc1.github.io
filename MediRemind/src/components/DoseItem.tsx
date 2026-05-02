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

  const medicineColor = medicine?.color ?? '#4A90D9';
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
              <Ionicons name="notifications-outline" size={12} color="#4A90D9" />
              <Text style={[styles.meta, { color: '#4A90D9' }]}> {offset}분 전</Text>
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
        {record.isTaken ? (
          <Ionicons name="checkmark" size={20} color="#fff" />
        ) : (
          <Text style={styles.checkLabel}>복용</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 72,
  },
  colorBar: {
    width: 5,
    alignSelf: 'stretch',
  },
  info: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  nameStrike: {
    textDecorationLine: 'line-through',
    color: '#AAA',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: 13,
    color: '#888',
  },
  metaDot: {
    color: '#CCC',
    fontSize: 13,
  },
  checkBtn: {
    marginRight: 14,
    backgroundColor: '#E9ECEF',
    borderRadius: 20,
    width: 64,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnDone: {
    backgroundColor: '#5CB85C',
  },
  checkLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
});
