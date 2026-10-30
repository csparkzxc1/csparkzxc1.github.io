/**
 * Text size slider: drag or tap along the track, like a volume control. Each
 * step is applied right away so the whole app previews the size live.
 */
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../theme/ThemeProvider';
import { TEXT_SCALES } from '../theme/theme';

const THUMB = 28;
const STEPS = TEXT_SCALES.length;

export default function TextSizeSlider() {
  const { t } = useI18n();
  const { colors, textStep, setTextStep } = useTheme();
  const [width, setWidth] = useState(0);
  const last = useRef(textStep);
  last.current = textStep;

  const stepAt = (x: number) => {
    const usable = Math.max(1, width - THUMB);
    const ratio = Math.min(Math.max((x - THUMB / 2) / usable, 0), 1);
    return Math.round(ratio * (STEPS - 1));
  };
  const select = (x: number) => {
    const step = stepAt(x);
    if (step === last.current) return;
    last.current = step;
    Haptics.selectionAsync().catch(() => {});
    setTextStep(step);
  };

  const gesture = Gesture.Race(
    Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-4, 4])
      .onBegin((e) => select(e.x))
      .onUpdate((e) => select(e.x)),
    Gesture.Tap()
      .runOnJS(true)
      .onEnd((e) => select(e.x))
  );

  const usable = Math.max(0, width - THUMB);
  const thumbLeft = (textStep / (STEPS - 1)) * usable;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t('settings.textSize')}
      accessibilityValue={{ min: 1, max: STEPS, now: textStep + 1 }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const next = textStep + (e.nativeEvent.actionName === 'increment' ? 1 : -1);
        if (next >= 0 && next < STEPS) setTextStep(next);
      }}
    >
      {/* Fixed sizes: the end labels shouldn't grow with the setting. */}
      <Text allowFontScaling={false} style={[styles.small, { color: colors.textMuted }]}>
        {t('settings.textSample')}
      </Text>
      <GestureDetector gesture={gesture}>
        <View style={styles.track} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
          <View style={[styles.rail, { backgroundColor: colors.surfaceMuted }]} />
          <View style={[styles.fill, { width: thumbLeft + THUMB / 2, backgroundColor: colors.brand }]} />
          {Array.from({ length: STEPS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.tick,
                { left: THUMB / 2 + (i / (STEPS - 1)) * usable - 2 },
                { backgroundColor: i <= textStep ? colors.onBrand : colors.textFaint },
              ]}
            />
          ))}
          <View style={[styles.thumb, { left: thumbLeft, backgroundColor: colors.surface, borderColor: colors.brand }]} />
        </View>
      </GestureDetector>
      <Text allowFontScaling={false} style={[styles.big, { color: colors.text }]}>
        {t('settings.textSample')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  small: { fontSize: 13, fontWeight: '700' },
  big: { fontSize: 24, fontWeight: '800' },
  track: { flex: 1, height: 44, justifyContent: 'center' },
  rail: { position: 'absolute', left: THUMB / 2, right: THUMB / 2, height: 6, borderRadius: 3 },
  fill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, marginLeft: 0 },
  tick: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
