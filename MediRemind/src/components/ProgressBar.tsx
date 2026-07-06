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

  const color = progress === 1 ? '#10B981' : '#4A6CF7';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>오늘 복용 현황</Text>
          <Text style={styles.count}>
            <Text style={[styles.taken, { color }]}>{takenCount}</Text>
            <Text style={styles.total}> / {totalCount}회 완료</Text>
          </Text>
        </View>
        <Text style={[styles.percentBig, { color }]}>
          {Math.round(progress * 100)}
          <Text style={styles.percentUnit}>%</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width: widthPercent, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A91A8',
    marginBottom: 4,
  },
  count: {
    fontSize: 15,
  },
  taken: {
    fontWeight: '800',
    fontSize: 18,
  },
  total: {
    color: '#8A91A8',
    fontWeight: '600',
  },
  percentBig: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  percentUnit: {
    fontSize: 20,
    fontWeight: '700',
  },
  track: {
    height: 14,
    backgroundColor: '#EBEEF6',
    borderRadius: 7,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 7,
  },
});
