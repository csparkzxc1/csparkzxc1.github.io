import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { DoseRecord, Medicine } from '../types';
import { formatTime, formatDosage } from '../i18n/core';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { cardShadow, type Scheme, type ThemeColors } from '../theme/theme';

interface DoseItemProps {
  record: DoseRecord;
  medicine: Medicine | undefined;
  onToggle: (record: DoseRecord) => void;
}

export default function DoseItem({ record, medicine, onToggle }: DoseItemProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onToggle(record);
  };

  const offset = medicine?.notificationOffset ?? 0;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.colorBar, { backgroundColor: medicine?.color ?? colors.brand }]} />
      <View style={styles.info}>
        <Text style={[styles.name, record.isTaken && styles.nameStrike]} numberOfLines={1}>
          {medicine?.name ?? t('common.unknownMedicine')}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.meta}> {formatTime(record.scheduledTime)}</Text>
          <Text style={styles.metaDot}>  ·  </Text>
          <Text style={styles.meta}>{formatDosage(medicine?.dosage ?? '')}</Text>
          {offset > 0 && (
            <>
              <Text style={styles.metaDot}>  ·  </Text>
              <Ionicons name="notifications-outline" size={12} color={colors.brand} />
              <Text style={[styles.meta, { color: colors.brand }]}> {t('dose.offset', { n: offset })}</Text>
            </>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.checkBtn, record.isTaken && styles.checkBtnDone]}
        onPress={handleToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={record.isTaken ? t('dose.unmark') : t('dose.markTaken')}
      >
        <Ionicons
          name="checkmark"
          size={26}
          color={record.isTaken ? colors.onBrand : colors.textFaint}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const makeStyles = (c: ThemeColors, scheme: Scheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 18,
      marginVertical: 6,
      overflow: 'hidden',
      minHeight: 76,
      ...cardShadow(c, scheme),
    },
    colorBar: { width: 5, alignSelf: 'stretch' },
    info: { flex: 1, paddingVertical: 16, paddingHorizontal: 16 },
    name: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 5, letterSpacing: -0.2 },
    nameStrike: { textDecorationLine: 'line-through', color: c.textFaint },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    meta: { fontSize: 13, color: c.textMuted },
    metaDot: { color: c.line, fontSize: 13 },
    checkBtn: {
      marginRight: 16,
      backgroundColor: c.surfaceMuted,
      borderRadius: 24,
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.line,
    },
    checkBtnDone: { backgroundColor: c.success, borderColor: c.success },
  });
