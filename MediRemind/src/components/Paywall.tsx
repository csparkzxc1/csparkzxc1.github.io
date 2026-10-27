/**
 * Full-version purchase screen. Shown as a dismissible modal (from Settings or
 * the trial banner) and as the non-dismissible lock once the trial ends.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEntitlement } from '../purchase/EntitlementProvider';
import { PURCHASE_CONFIG } from '../purchase/purchase.config';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/theme';

const FEATURE_KEYS = ['paywall.f1', 'paywall.f2', 'paywall.f3', 'paywall.f4', 'paywall.f5', 'paywall.f6'];

interface Props {
  dismissible?: boolean;
  onDismiss?: () => void;
}

export default function Paywall({ dismissible = false, onDismiss }: Props) {
  const { status, trialDaysLeft, product, purchase, restore } = useEntitlement();
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState<null | 'buy' | 'restore'>(null);

  const priceLabel = product?.priceLabel ?? PURCHASE_CONFIG.fallbackPriceLabel;

  const onBuy = async () => {
    if (busy) return;
    setBusy('buy');
    try {
      const ok = await purchase();
      if (ok && dismissible) onDismiss?.();
    } catch (e) {
      console.warn('[paywall] purchase failed', e);
      Alert.alert(t('paywall.failTitle'), t('paywall.failBody'));
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy('restore');
    try {
      const ok = await restore();
      if (ok) {
        Alert.alert(t('settings.restoreDoneTitle'), t('settings.restoreDoneBody'));
        if (dismissible) onDismiss?.();
      } else {
        Alert.alert(t('settings.restoreNoneTitle'), t('settings.restoreNoneBody'));
      }
    } catch (e) {
      console.warn('[paywall] restore failed', e);
      Alert.alert(t('common.error'), t('settings.restoreFail'));
    } finally {
      setBusy(null);
    }
  };

  const statusLine =
    status === 'locked'
      ? t('paywall.trialEnded')
      : status === 'trial'
        ? t('paywall.trialLeft', { n: trialDaysLeft })
        : t('paywall.active');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {dismissible && (
          <TouchableOpacity style={styles.close} onPress={onDismiss} accessibilityLabel={t('paywall.later')}>
            <Ionicons name="close" size={26} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>💊</Text>
          </View>
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={[styles.status, status === 'locked' && { color: colors.danger }]}>
            {statusLine}
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURE_KEYS.map((key) => (
            <View key={key} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={styles.featureText}>{t(key)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.priceBox}>
          <Text style={styles.price}>{priceLabel}</Text>
          <Text style={styles.priceSub}>{t('paywall.oneTime')}</Text>
        </View>

        {product && product.available === false && (
          <Text style={styles.unavailable}>{t('paywall.unavailable')}</Text>
        )}

        <TouchableOpacity
          style={styles.buyBtn}
          onPress={onBuy}
          disabled={busy !== null}
          activeOpacity={0.85}
        >
          {busy === 'buy' ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.buyText}>{t('paywall.buy', { price: priceLabel })}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={onRestore}
          disabled={busy !== null}
          activeOpacity={0.7}
        >
          {busy === 'restore' ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <Text style={styles.restoreText}>{t('settings.restore')}</Text>
          )}
        </TouchableOpacity>

        {dismissible && status !== 'locked' && (
          <TouchableOpacity style={styles.laterBtn} onPress={onDismiss} disabled={busy !== null}>
            <Text style={styles.laterText}>{t('paywall.later')}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footer}>{t('paywall.footer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { padding: 24, paddingBottom: 40 },
    close: { alignSelf: 'flex-end', padding: 4 },
    hero: { alignItems: 'center', paddingTop: 12 },
    heroIcon: {
      width: 88,
      height: 88,
      borderRadius: 26,
      backgroundColor: c.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroEmoji: { fontSize: 44 },
    title: { marginTop: 18, fontSize: 24, fontWeight: '800', color: c.text, letterSpacing: -0.4 },
    status: { marginTop: 8, fontSize: 14, fontWeight: '700', color: c.brand },
    features: {
      marginTop: 28,
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 18,
      gap: 14,
    },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    featureText: { flex: 1, fontSize: 15, color: c.text },
    priceBox: { marginTop: 28, alignItems: 'center' },
    price: { fontSize: 34, fontWeight: '800', color: c.text },
    priceSub: { marginTop: 4, fontSize: 13, color: c.textMuted },
    unavailable: { marginTop: 14, textAlign: 'center', fontSize: 13, color: c.danger },
    buyBtn: {
      marginTop: 24,
      backgroundColor: c.brand,
      borderRadius: 16,
      paddingVertical: 17,
      alignItems: 'center',
    },
    buyText: { color: c.onBrand, fontSize: 17, fontWeight: '700' },
    restoreBtn: {
      marginTop: 12,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.line,
    },
    restoreText: { color: c.text, fontSize: 15, fontWeight: '600' },
    laterBtn: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
    laterText: { color: c.textMuted, fontSize: 14, fontWeight: '600' },
    footer: { marginTop: 20, textAlign: 'center', fontSize: 12, color: c.textMuted, lineHeight: 18 },
  });
