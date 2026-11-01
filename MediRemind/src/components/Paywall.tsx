/**
 * Full-version purchase screen, opened from Settings or when a free user tries
 * to add more medicines than the free limit.
 */
import React, { useEffect, useState } from 'react';
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
import { PurchaseFailure } from '../purchase/realProvider';
import { FREE_MEDICINE_LIMIT, PURCHASE_CONFIG } from '../purchase/purchase.config';
import { useMedicineStore } from '../store/medicineStore';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/theme';

const FEATURE_KEYS = ['paywall.f1', 'paywall.fGuardian', 'paywall.f2', 'paywall.f3', 'paywall.f4'];

interface Props {
  /** Why the paywall opened: the free medicine limit, or linking to watch a family member. */
  reason?: 'limit' | 'guardian';
  onDismiss: () => void;
}

export default function Paywall({ reason, onDismiss }: Props) {
  const { isPro, product, purchase, restore, refreshProduct } = useEntitlement();
  const count = useMedicineStore((s) => s.medicines.length);
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState<null | 'buy' | 'restore'>(null);

  // The launch-time fetch may have failed (offline, store not ready yet).
  useEffect(() => {
    if (!isPro && product?.available !== true) refreshProduct().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const price = product?.priceLabel ?? PURCHASE_CONFIG.fallbackPriceLabel;

  const onBuy = async () => {
    if (busy) return;
    setBusy('buy');
    try {
      if (await purchase()) onDismiss();
    } catch (e) {
      console.warn('[paywall] purchase failed', e);
      const code = e instanceof PurchaseFailure ? e.code : '';
      const body = /sku-not-found|item-unavailable|not-prepared|init-connection/i.test(code)
        ? t('paywall.failStoreBody')
        : t('paywall.failBody');
      Alert.alert(t('paywall.failTitle'), code ? `${body}\n(${code})` : body);
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy('restore');
    try {
      if (await restore()) {
        Alert.alert(t('settings.restoreDoneTitle'), t('settings.restoreDoneBody'));
        onDismiss();
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

  const statusLine = isPro
    ? t('paywall.active')
    : reason === 'limit'
      ? t('paywall.limitReached', { n: FREE_MEDICINE_LIMIT })
      : reason === 'guardian'
        ? t('paywall.guardianReason')
      : t('paywall.freeUsage', { n: count, max: FREE_MEDICINE_LIMIT });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.close} onPress={onDismiss} accessibilityLabel={t('paywall.later')}>
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>💊</Text>
          </View>
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.status}>{statusLine}</Text>
        </View>

        <View style={styles.features}>
          {FEATURE_KEYS.map((key) => (
            <View key={key} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={styles.featureText}>{t(key, { n: FREE_MEDICINE_LIMIT })}</Text>
            </View>
          ))}
        </View>

        {!isPro && (
          <>
            <View style={styles.priceBox}>
              <Text style={styles.price}>{price}</Text>
              <Text style={styles.priceSub}>{t('paywall.oneTime')}</Text>
            </View>

            {product && product.available === false && (
              <Text style={styles.unavailable}>{t('paywall.unavailable')}</Text>
            )}

            <TouchableOpacity style={styles.buyBtn} onPress={onBuy} disabled={busy !== null} activeOpacity={0.85}>
              {busy === 'buy' ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text style={styles.buyText}>{t('paywall.buy', { price })}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.restoreBtn} onPress={onRestore} disabled={busy !== null} activeOpacity={0.7}>
              {busy === 'restore' ? (
                <ActivityIndicator color={colors.brand} />
              ) : (
                <Text style={styles.restoreText}>{t('settings.restore')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.laterBtn} onPress={onDismiss} disabled={busy !== null}>
              <Text style={styles.laterText}>{t('paywall.later')}</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.footer}>{t('paywall.footer', { n: FREE_MEDICINE_LIMIT })}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { padding: 24, paddingBottom: 40 },
    close: { alignSelf: 'flex-end', padding: 4 },
    hero: { alignItems: 'center', paddingTop: 4 },
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
    status: { marginTop: 8, fontSize: 14, fontWeight: '700', color: c.brand, textAlign: 'center' },
    features: { marginTop: 28, backgroundColor: c.surface, borderRadius: 18, padding: 18, gap: 14 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    featureText: { flex: 1, fontSize: 15, color: c.text },
    priceBox: { marginTop: 28, alignItems: 'center' },
    price: { fontSize: 34, fontWeight: '800', color: c.text },
    priceSub: { marginTop: 4, fontSize: 13, color: c.textMuted },
    unavailable: { marginTop: 14, textAlign: 'center', fontSize: 13, color: c.danger },
    buyBtn: { marginTop: 24, backgroundColor: c.brand, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
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
