import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0..1
  takenCount: number;
  totalCount: number;
}

export default function ProgressBar({ progress, takenCount, totalCount }: ProgressBarProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthPercent = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const color =
    progress === 1 ? '#5CB85C' : progress >= 0.5 ? '#F0AD4E' : '#4A90D9';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>오늘 복용 현황</Text>
        <Text style={styles.count}>
          <Text style={[styles.taken, { color }]}>{takenCount}</Text>
          <Text style={styles.total}> / {totalCount} 완료</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width: widthPercent, backgroundColor: color }]}
        />
      </View>
      <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  count: {
    fontSize: 14,
  },
  taken: {
    fontWeight: '700',
    fontSize: 16,
  },
  total: {
    color: '#888',
  },
  track: {
    height: 12,
    backgroundColor: '#E9ECEF',
    borderRadius: 6,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
  percent: {
    marginTop: 4,
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
});
