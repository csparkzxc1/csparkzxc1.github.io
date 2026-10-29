/**
 * Family alerts: share my doses with family (invite code), watch a family
 * member's doses (enter code), and see their doses for today.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useMedicineStore } from '../store/medicineStore';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { cardShadow, type Scheme, type ThemeColors } from '../theme/theme';
import {
  createInvite,
  deleteAllData,
  getDisplayName,
  getLinks,
  patientToday,
  redeemInvite,
  setAlertDelay,
  setDisplayName,
  unlink,
  type Links,
  type Person,
} from '../guardian/guardian';
import { ALERT_DELAYS, slotState, type DoseSlot, type SlotState } from '../guardian/slots';

export default function GuardianScreen() {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const medicines = useMedicineStore((s) => s.medicines);

  const [links, setLinks] = useState<Links | null>(null);
  const [today, setToday] = useState<Record<string, DoseSlot[]>>({});
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'load' | 'invite' | 'link' | 'name'>(null);

  const fail = useCallback(
    (e: unknown) => {
      console.warn('[guardian]', e);
      Alert.alert(t('common.error'), t('guardian.error'));
    },
    [t]
  );

  const load = useCallback(async () => {
    setBusy('load');
    try {
      const l = await getLinks();
      setLinks(l);
      if (!l) return;
      setName(await getDisplayName());
      const entries = await Promise.all(
        l.patients.map(async (p) => [p.id, await patientToday(p.id)] as const)
      );
      setToday(Object.fromEntries(entries));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }, [fail]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onInvite = async () => {
    setBusy('invite');
    try {
      setInvite(await createInvite(medicines));
      setLinks(await getLinks());
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const onLink = async () => {
    if (code.replace(/\D/g, '').length !== 6) {
      Alert.alert(t('guardian.invalidCode'));
      return;
    }
    setBusy('link');
    try {
      const result = await redeemInvite(code);
      if (result === 'invalid_code') Alert.alert(t('guardian.invalidCode'));
      else if (result === 'own_code') Alert.alert(t('guardian.ownCode'));
      else {
        setCode('');
        Alert.alert(t(result === 'linked' ? 'guardian.linked' : 'guardian.linkedNoPush'));
        await load();
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const onSaveName = async () => {
    setBusy('name');
    try {
      await setDisplayName(name);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const onDelay = (patientId: string, minutes: number) => {
    // Show the choice right away; put it back if the server refuses.
    const previous = links;
    setLinks((l) =>
      l && { ...l, patients: l.patients.map((p) => (p.id === patientId ? { ...p, alertDelay: minutes } : p)) }
    );
    setAlertDelay(patientId, minutes).catch((e) => {
      setLinks(previous);
      fail(e);
    });
  };

  const confirmUnlink = (person: Person, patientId: string, guardianId: string) => {
    Alert.alert(t('guardian.unlinkConfirm', { name: person.name || t('guardian.unnamed') }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('guardian.unlink'),
        style: 'destructive',
        onPress: () => unlink(patientId, guardianId).then(load).catch(fail),
      },
    ]);
  };

  const confirmDeleteAll = () => {
    Alert.alert(t('guardian.deleteAll'), t('guardian.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          deleteAllData()
            .then(() => {
              setLinks(null);
              setToday({});
              setInvite(null);
              setName('');
            })
            .catch(fail),
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={busy === 'load'} onRefresh={load} />}
    >
      <Text style={styles.intro}>{t('guardian.intro')}</Text>

      {links && (
        <View style={styles.card}>
          <Text style={styles.label}>{t('guardian.myName')}</Text>
          <View style={styles.inline}>
            <TextInput
              style={[styles.input, styles.flex]}
              value={name}
              onChangeText={setName}
              placeholder={t('guardian.myNamePlaceholder')}
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={onSaveName}
            />
            <SmallButton label={t('guardian.save')} busy={busy === 'name'} onPress={onSaveName} />
          </View>
        </View>
      )}

      <Text style={styles.section}>{t('guardian.sectionMine')}</Text>
      <View style={styles.card}>
        {links?.guardians.length ? (
          links.guardians.map((g) => (
            <PersonRow key={g.id} person={g} onUnlink={() => confirmUnlink(g, links.me, g.id)} />
          ))
        ) : (
          <Text style={styles.muted}>{t('guardian.noGuardians')}</Text>
        )}
        {invite ? (
          <View style={styles.inviteBox}>
            <Text style={styles.inviteLabel}>{t('guardian.inviteTitle')}</Text>
            <Text style={styles.inviteCode} selectable>
              {invite.slice(0, 3)} {invite.slice(3)}
            </Text>
            <Text style={styles.muted}>{t('guardian.inviteBody')}</Text>
            <PrimaryButton
              label={t('guardian.share')}
              onPress={() => Share.share({ message: t('guardian.shareMessage', { code: invite }) })}
            />
          </View>
        ) : (
          <PrimaryButton label={t('guardian.invite')} busy={busy === 'invite'} onPress={onInvite} />
        )}
        <Text style={styles.fine}>{t('guardian.privacy')}</Text>
      </View>

      <Text style={styles.section}>{t('guardian.sectionWatching')}</Text>
      <View style={styles.card}>
        {links?.patients.length ? (
          links.patients.map((p) => (
            <View key={p.id} style={styles.patient}>
              <PersonRow person={p} onUnlink={() => confirmUnlink(p, p.id, links.me)} />
              <DelayPicker value={p.alertDelay} onChange={(m) => onDelay(p.id, m)} />
              <TodayList slots={today[p.id] ?? []} delay={p.alertDelay} />
            </View>
          ))
        ) : (
          <Text style={styles.muted}>{t('guardian.noPatients')}</Text>
        )}
        <View style={styles.inline}>
          <TextInput
            style={[styles.input, styles.flex, code !== '' && styles.codeInput]}
            value={code}
            onChangeText={setCode}
            placeholder={t('guardian.codePlaceholder')}
            keyboardType="number-pad"
            maxLength={7}
          />
          <SmallButton label={t('guardian.connect')} busy={busy === 'link'} onPress={onLink} />
        </View>
      </View>

      {links && (
        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDeleteAll}>
          <Text style={styles.deleteText}>{t('guardian.deleteAll')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function PersonRow({ person, onUnlink }: { person: Person; onUnlink: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.personRow}>
      <Ionicons name="person-circle" size={28} color={colors.brand} />
      <Text style={styles.personName}>{person.name || t('guardian.unnamed')}</Text>
      <TouchableOpacity onPress={onUnlink} hitSlop={8}>
        <Text style={styles.unlink}>{t('guardian.unlink')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function DelayPicker({ value, onChange }: { value: number; onChange: (m: number) => void }) {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  return (
    <View>
      <Text style={styles.label}>{t('guardian.delayLabel')}</Text>
      <View style={styles.delayRow}>
        {ALERT_DELAYS.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.delayChip, value === m && styles.delayChipOn]}
            onPress={() => onChange(m)}
            accessibilityRole="button"
            accessibilityState={{ selected: value === m }}
          >
            <Text style={[styles.delayText, value === m && styles.delayTextOn]}>
              {m < 60 ? t('guardian.delayMin', { n: m }) : t('guardian.delayHour', { n: m / 60 })}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TodayList({ slots, delay }: { slots: DoseSlot[]; delay: number }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const now = new Date();
  const tone: Record<SlotState, string> = {
    taken: colors.success,
    upcoming: colors.textMuted,
    late: colors.warning,
    missed: colors.danger,
  };
  if (!slots.length) return <Text style={styles.muted}>{t('guardian.noDosesToday')}</Text>;
  return (
    <View>
      <Text style={styles.label}>{t('guardian.today')}</Text>
      {slots.map((s) => {
        const state = slotState(s, now, delay);
        const d = new Date(s.due_at);
        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return (
          <View key={s.id} style={styles.slot}>
            <Text style={styles.slotTime}>{time}</Text>
            <Text style={styles.slotName} numberOfLines={1}>
              {s.medicine_name}
            </Text>
            <Text style={[styles.slotState, { color: tone[state] }]}>{t(`guardian.state.${state}`)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function PrimaryButton({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity style={styles.primary} onPress={onPress} disabled={busy} activeOpacity={0.85}>
      {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.primaryText}>{label}</Text>}
    </TouchableOpacity>
  );
}

function SmallButton({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity style={styles.small} onPress={onPress} disabled={busy} activeOpacity={0.85}>
      {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.primaryText}>{label}</Text>}
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors, scheme: Scheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 48 },
    intro: { fontSize: 14, color: c.textMuted, lineHeight: 20, marginBottom: 16 },
    section: { fontSize: 13, fontWeight: '700', color: c.textMuted, marginTop: 8, marginBottom: 8, marginLeft: 4 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      gap: 12,
      ...cardShadow(c, scheme),
    },
    label: { fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 },
    muted: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
    fine: { fontSize: 12, color: c.textFaint, lineHeight: 17 },
    inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    flex: { flex: 1 },
    input: {
      backgroundColor: c.inputBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: c.text,
    },
    codeInput: { fontSize: 20, letterSpacing: 4, fontWeight: '700' },
    primary: {
      backgroundColor: c.brand,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    small: {
      backgroundColor: c.brand,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 18,
      alignItems: 'center',
      minWidth: 64,
    },
    primaryText: { color: c.onBrand, fontSize: 15, fontWeight: '700' },
    inviteBox: { backgroundColor: c.brandSoft, borderRadius: 14, padding: 16, gap: 10 },
    inviteLabel: { fontSize: 13, fontWeight: '700', color: c.brand, textAlign: 'center' },
    inviteCode: { fontSize: 40, fontWeight: '800', letterSpacing: 6, color: c.text, textAlign: 'center' },
    personRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    personName: { flex: 1, fontSize: 16, fontWeight: '700', color: c.text },
    unlink: { fontSize: 13, color: c.danger, fontWeight: '600' },
    patient: { gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.line },
    slot: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
    slotTime: { width: 48, fontSize: 14, fontWeight: '700', color: c.text },
    slotName: { flex: 1, fontSize: 14, color: c.text },
    slotState: { fontSize: 13, fontWeight: '800' },
    delayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    delayChip: {
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: c.surfaceMuted,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    delayChipOn: { backgroundColor: c.brandSoft, borderColor: c.brand },
    delayText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    delayTextOn: { color: c.brand },
    deleteBtn: { alignItems: 'center', paddingVertical: 12 },
    deleteText: { fontSize: 13, color: c.danger },
  });
