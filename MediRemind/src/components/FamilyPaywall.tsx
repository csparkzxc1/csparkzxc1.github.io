/**
 * Family plan subscription screen: yearly / monthly choice, 7-day free trial
 * for first-time subscribers, and the disclosures Apple requires for
 * auto-renewing subscriptions (price per period, renewal, how to cancel,
 * terms and privacy links, restore).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEntitlement } from '../purchase/EntitlementProvider';
import { PurchaseFailure } from '../purchase/realProvider';
import { FAMILY_PLANS, TERMS_URL } from '../purchase/purchase.config';
import { yearlySaving } from '../purchase/family';
import type { FamilyPlanProduct } from '../purchase/types';
import { PRIVACY_POLICY_URL } from '../config';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/theme';

const FEATURES = ['family.f1', 'family.f2', 'family.f3', 'family.f4'];

const FALLBACK_PLANS: FamilyPlanProduct[] = FAMILY_PLANS.map((p) => ({
  id: p.id,
  period: p.period,
  priceLabel: p.fallbackPriceLabel,
  price: p.fallbackPrice,
  available: false,
}));

export default function FamilyPaywall({ onDismiss }: { onDismiss: () => void }) {
  const { familyOffer, refreshFamilyOffer, purchaseFamily, restore } = useEntitlement();
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [selected, setSelected] = useState(FAMILY_PLANS[0].id);
  const [busy, setBusy] = useState<null | 'buy' | 'restore'>(null);

  useEffect(() => {
    refreshFamilyOffer().catch(() => {});
  }, [refreshFamilyOffer]);

  const plans = familyOffer?.plans ?? FALLBACK_PLANS;
  const trial = familyOffer?.trialEligible ?? true;
  const saving = yearlySaving(plans);
  const plan = plans.find((p) => p.id === selected) ?? plans[0];
  const priceLine = trial
    ? t(plan.period === 'year' ? 'family.thenYear' : 'family.thenMonth', { price: plan.priceLabel })
    : t(plan.period === 'year' ? 'family.perYear' : 'family.perMonth', { price: plan.priceLabel });

  const onBuy = async () => {
    if (busy) return;
    setBusy('buy');
    try {
      if (await purchaseFamily(plan.id)) onDismiss();
    } catch (e) {
      console.warn('[family] purchase failed', e);
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
      console.warn('[family] restore failed', e);
      Alert.alert(t('common.error'), t('settings.restoreFail'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.close} onPress={onDismiss} accessibilityLabel={t('paywall.later')}>
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="people" size={42} color={colors.success} />
          </View>
          <Text style={styles.title}>{t('family.title')}</Text>
          <Text style={styles.sub}>{t('family.sub')}</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((key) => (
            <View key={key} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={styles.featureText}>{t(key)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          {plans.map((p) => {
            const on = p.id === plan.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.plan, on && styles.planOn]}
                onPress={() => setSelected(p.id)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                {p.period === 'year' && saving ? (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{t('family.save', { n: saving })}</Text>
                  </View>
                ) : null}
                <View style={[styles.radio, on && styles.radioOn]} />
                <View style={styles.planBody}>
                  <Text style={styles.planName}>{t(p.period === 'year' ? 'family.yearly' : 'family.monthly')}</Text>
                  {trial ? <Text style={styles.planSub}>{t('family.trialTag')}</Text> : null}
                </View>
                <Text style={styles.planPrice}>{p.priceLabel}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {familyOffer && plans.every((p) => !p.available) && (
          <Text style={styles.unavailable}>{t('paywall.unavailable')}</Text>
        )}

        <TouchableOpacity style={styles.buyBtn} onPress={onBuy} disabled={busy !== null} activeOpacity={0.85}>
          {busy === 'buy' ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.buyText}>{t(trial ? 'family.startTrial' : 'family.subscribe')}</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.priceLine}>{priceLine}</Text>

        <Text style={styles.legal}>{t('family.legal')}</Text>

        <View style={styles.links}>
          <TouchableOpacity onPress={onRestore} disabled={busy !== null}>
            {busy === 'restore' ? (
              <ActivityIndicator color={colors.brand} />
            ) : (
              <Text style={styles.link}>{t('settings.restore')}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.dot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}>
            <Text style={styles.link}>{t('family.terms')}</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}>
            <Text style={styles.link}>{t('settings.privacy')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { padding: 24, paddingBottom: 40 },
    close: { alignSelf: 'flex-end', padding: 4 },
    hero: { alignItems: 'center' },
    heroIcon: {
      width: 84,
      height: 84,
      borderRadius: 26,
      backgroundColor: c.success + '22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { marginTop: 16, fontSize: 24, fontWeight: '800', color: c.text, letterSpacing: -0.4, textAlign: 'center' },
    sub: { marginTop: 6, fontSize: 14, color: c.textMuted, textAlign: 'center' },
    features: { marginTop: 22, backgroundColor: c.surface, borderRadius: 18, padding: 16, gap: 12 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    featureText: { flex: 1, fontSize: 15, color: c.text },
    plans: { marginTop: 22, gap: 12 },
    plan: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: c.line,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    planOn: { borderColor: c.brand, backgroundColor: c.brandSoft },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.textFaint },
    radioOn: { borderWidth: 7, borderColor: c.brand },
    planBody: { flex: 1 },
    planName: { fontSize: 16, fontWeight: '700', color: c.text },
    planSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    planPrice: { fontSize: 17, fontWeight: '800', color: c.text },
    tag: {
      position: 'absolute',
      top: -10,
      right: 14,
      backgroundColor: c.danger,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    tagText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
    unavailable: { marginTop: 14, textAlign: 'center', fontSize: 13, color: c.danger },
    buyBtn: { marginTop: 22, backgroundColor: c.brand, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
    buyText: { color: c.onBrand, fontSize: 17, fontWeight: '800' },
    priceLine: { marginTop: 10, textAlign: 'center', fontSize: 14, fontWeight: '600', color: c.text },
    legal: { marginTop: 14, fontSize: 11.5, lineHeight: 17, color: c.textMuted, textAlign: 'center' },
    links: { marginTop: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    link: { fontSize: 13, color: c.textMuted, textDecorationLine: 'underline', paddingVertical: 4 },
    dot: { color: c.textFaint },
  });
