/**
 * First-launch screen. Per App Review Guideline 3.1.1 it states the trial
 * length, what stops working afterwards, and the price before the user
 * explicitly starts the trial.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEntitlement } from '../purchase/EntitlementProvider';
import { PURCHASE_CONFIG } from '../purchase/purchase.config';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { cardShadow, type Scheme, type ThemeColors } from '../theme/theme';

export default function TrialIntro() {
  const { product, startTrial, purchase, restore } = useEntitlement();
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState<null | 'trial' | 'buy' | 'restore'>(null);

  const price = product?.priceLabel ?? PURCHASE_CONFIG.fallbackPriceLabel;

  const run = async (kind: 'trial' | 'buy' | 'restore') => {
    if (busy) return;
    setBusy(kind);
    try {
      if (kind === 'trial') await startTrial();
      else if (kind === 'buy') await purchase();
      else if (!(await restore())) {
        Alert.alert(t('settings.restoreNoneTitle'), t('settings.restoreNoneBody'));
      }
    } catch (e) {
      console.warn('[intro] action failed', kind, e);
      Alert.alert(
        kind === 'trial' ? t('common.error') : t('paywall.failTitle'),
        kind === 'trial' ? t('intro.startFail') : kind === 'buy' ? t('paywall.failBody') : t('settings.restoreFail')
      );
    } finally {
      setBusy(null);
    }
  };

  const terms: [React.ComponentProps<typeof Ionicons>['name'], string][] = [
    ['calendar-outline', t('intro.termLength')],
    ['lock-closed-outline', t('intro.termLocked')],
    ['card-outline', t('intro.termPrice', { price })],
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>💊</Text>
          </View>
          <Text style={styles.title}>{t('intro.title')}</Text>
          <Text style={styles.subtitle}>{t('intro.subtitle')}</Text>
        </View>

        <View style={styles.terms}>
          <Text style={styles.termsTitle}>{t('intro.termsTitle')}</Text>
          {terms.map(([icon, text]) => (
            <View key={icon} style={styles.termRow}>
              <Ionicons name={icon} size={20} color={colors.brand} />
              <Text style={styles.termText}>{text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primary} onPress={() => run('trial')} disabled={busy !== null}>
          {busy === 'trial' ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.primaryText}>{t('intro.start')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={() => run('buy')} disabled={busy !== null}>
          {busy === 'buy' ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <Text style={styles.secondaryText}>{t('intro.buyNow', { price })}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => run('restore')} disabled={busy !== null}>
          {busy === 'restore' ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : (
            <Text style={styles.linkText}>{t('settings.restore')}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>{t('intro.footer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors, scheme: Scheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { padding: 24, paddingBottom: 40 },
    hero: { alignItems: 'center', paddingTop: 20 },
    heroIcon: {
      width: 88,
      height: 88,
      borderRadius: 26,
      backgroundColor: c.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroEmoji: { fontSize: 44 },
    title: {
      marginTop: 20,
      fontSize: 26,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    subtitle: { marginTop: 8, fontSize: 15, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
    terms: {
      marginTop: 28,
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 18,
      gap: 14,
      ...cardShadow(c, scheme),
    },
    termsTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    termRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    termText: { flex: 1, fontSize: 14, color: c.text, lineHeight: 21 },
    primary: {
      marginTop: 28,
      backgroundColor: c.brand,
      borderRadius: 16,
      paddingVertical: 17,
      alignItems: 'center',
    },
    primaryText: { color: c.onBrand, fontSize: 17, fontWeight: '700' },
    secondary: {
      marginTop: 12,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.line,
    },
    secondaryText: { color: c.text, fontSize: 15, fontWeight: '600' },
    link: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
    linkText: { color: c.textMuted, fontSize: 14, fontWeight: '600' },
    footer: { marginTop: 12, textAlign: 'center', fontSize: 12, color: c.textMuted, lineHeight: 18 },
  });
