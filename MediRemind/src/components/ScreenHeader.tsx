import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/theme';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

/** Large light title used at the top of each tab. */
export default function ScreenHeader({ title, subtitle, right }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.header}>
      <View style={styles.titles}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      backgroundColor: c.bg,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,
      gap: 12,
    },
    titles: { flex: 1 },
    subtitle: { color: c.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 4 },
    title: { color: c.text, fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  });
