import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/theme';

interface ProgressBarProps {
  progress: number; // 0..1
  takenCount: number;
  totalCount: number;
}

export default function ProgressBar({ progress, takenCount, totalCount }: ProgressBarProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, { toValue: progress, duration: 600, useNativeDriver: false }).start();
  }, [progress, animatedWidth]);

  const width = animatedWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const color = progress === 1 ? colors.success : colors.brand;

  return (
    <View>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>{t('progress.label')}</Text>
          <Text style={styles.count}>
            <Text style={[styles.taken, { color }]}>{takenCount}</Text>
            <Text style={styles.total}>{t('progress.count', { total: totalCount })}</Text>
          </Text>
        </View>
        <Text style={[styles.percent, { color }]}>
          {Math.round(progress * 100)}
          <Text style={styles.percentUnit}>%</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    label: { fontSize: 14, fontWeight: '600', color: c.textMuted, marginBottom: 4 },
    count: { fontSize: 15 },
    taken: { fontWeight: '800', fontSize: 18 },
    total: { color: c.textMuted, fontWeight: '600' },
    percent: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
    percentUnit: { fontSize: 20, fontWeight: '700' },
    track: { height: 14, backgroundColor: c.surfaceMuted, borderRadius: 7, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 7 },
  });
