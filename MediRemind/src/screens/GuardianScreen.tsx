/**
 * Family alerts: share my doses with family (invite code), watch a family
 * member's doses (enter code), and see their doses for today.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
  patientHistory,
  redeemInvite,
  setAlertDelay,
  setDisplayName,
  unlink,
  type Links,
  type Patient,
  type Person,
} from '../guardian/guardian';
import {
  adherenceRate,
  ALERT_DELAYS,
  dailyTally,
  slotState,
  type DoseSlot,
  type SlotState,
} from '../guardian/slots';
import { formatShortDate } from '../i18n/core';
import { useEntitlement } from '../purchase/EntitlementProvider';
import type { RootStackParamList } from '../types';
import { dateKey } from '../lib/schedule';

export default function GuardianScreen() {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const medicines = useMedicineStore((s) => s.medicines);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Sharing my doses is free; watching a family member is part of the full version.
  const { isPro } = useEntitlement();
  const resumeLink = useRef(false);

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
        l.patients.map(async (p) => [p.id, await patientHistory(p.id)] as const)
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

  // Back from the paywall with the full version: finish linking the entered code.
  useEffect(() => {
    if (isPro && resumeLink.current) onLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro]);

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
    if (!isPro) {
      // Link right after a purchase, when the paywall closes.
      resumeLink.current = true;
      navigation.navigate('Paywall', { reason: 'guardian' });
      return;
    }
    resumeLink.current = false;
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
          <>
            {links.guardians.map((g) => (
              <SwipeToUnlink key={g.id} person={g} onUnlink={() => confirmUnlink(g, links.me, g.id)} />
            ))}
            <Text style={styles.swipeHint}>{t('guardian.swipeHint')}</Text>
          </>
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
      {links?.patients.map((p) => (
        <PatientCard
          key={p.id}
          patient={p}
          slots={today[p.id] ?? []}
          onDelay={(m) => onDelay(p.id, m)}
          onUnlink={() => confirmUnlink(p, p.id, links.me)}
        />
      ))}
      <View style={styles.card}>
        {!links?.patients.length && <Text style={styles.muted}>{t('guardian.noPatients')}</Text>}
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
        {!isPro && <Text style={styles.fine}>{t('guardian.proNote')}</Text>}
      </View>

      {links && (
        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDeleteAll}>
          <Text style={styles.deleteText}>{t('guardian.deleteAll')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function Avatar({ color }: { color: string }) {
  return <Ionicons name="person-circle" size={30} color={color} />;
}

/** A family member watching me. Unlinking sits behind a swipe so it isn't hit by accident. */
function SwipeToUnlink({ person, onUnlink }: { person: Person; onUnlink: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const ref = useRef<Swipeable>(null);
  return (
    <Swipeable
      ref={ref}
      friction={1.6}
      overshootRight={false}
      childrenContainerStyle={styles.swipeBacking}
      renderRightActions={() => (
        <TouchableOpacity
          style={styles.unlinkAction}
          onPress={() => {
            ref.current?.close();
            onUnlink();
          }}
        >
          <Ionicons name="link-outline" size={18} color="#FFF" />
          <Text style={styles.unlinkActionText}>{t('guardian.unlink')}</Text>
        </TouchableOpacity>
      )}
    >
      <View style={styles.personRow}>
        <Avatar color={colors.brand} />
        <Text style={styles.personName}>{person.name || t('guardian.unnamed')}</Text>
      </View>
    </Swipeable>
  );
}

/**
 * A family member I watch. The front shows today's doses; the menu button
 * flips the card to its back, which holds the alert timing, the link date and
 * the unlink button.
 */
function PatientCard({
  patient,
  slots,
  onDelay,
  onUnlink,
}: {
  patient: Patient;
  slots: DoseSlot[];
  onDelay: (minutes: number) => void;
  onUnlink: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const flip = useRef(new Animated.Value(0)).current;
  const [showBack, setShowBack] = useState(false);
  const [heights, setHeights] = useState({ front: 0, back: 0 });
  const height = Math.max(heights.front, heights.back);

  const turn = (toBack: boolean) => {
    setShowBack(toBack);
    Animated.spring(flip, { toValue: toBack ? 1 : 0, friction: 8, tension: 40, useNativeDriver: true }).start();
  };
  const front = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const back = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const name = patient.name || t('guardian.unnamed');
  const todayKey = dateKey(new Date());
  // The list shows today, or the day picked on the chart.
  const [day, setDay] = useState(todayKey);
  const daySlots = slots.filter((s) => dateKey(new Date(s.due_at)) === day);
  const faceHeight = height ? { minHeight: height } : null;

  return (
    <View style={[styles.flipWrap, height ? { height } : null]}>
      <Animated.View
        pointerEvents={showBack ? 'none' : 'auto'}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setHeights((x) => (x.front === h ? x : { ...x, front: h }));
        }}
        style={[styles.card, styles.face, faceHeight, { transform: [{ perspective: 1200 }, { rotateY: front }] }]}
      >
        <View style={styles.personRow}>
          <Avatar color={colors.brand} />
          <Text style={styles.personName}>{name}</Text>
          <TouchableOpacity onPress={() => turn(true)} hitSlop={10} accessibilityLabel={t('guardian.details')}>
            <Ionicons name="menu" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <TodayList
          slots={daySlots}
          delay={patient.alertDelay}
          title={day === todayKey ? undefined : t('guardian.dayDoses', { date: formatShortDate(day) })}
          onBackToToday={day === todayKey ? undefined : () => setDay(todayKey)}
        />
        <HistoryChart
          slots={slots}
          delay={patient.alertDelay}
          selected={day}
          onSelect={(d) => setDay(d === day ? todayKey : d)}
        />
      </Animated.View>

      <Animated.View
        pointerEvents={showBack ? 'auto' : 'none'}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setHeights((x) => (x.back === h ? x : { ...x, back: h }));
        }}
        style={[styles.card, styles.face, faceHeight, { transform: [{ perspective: 1200 }, { rotateY: back }] }]}
      >
        <View style={styles.personRow}>
          <Avatar color={colors.brand} />
          <View style={styles.flex}>
            <Text style={styles.personName}>{name}</Text>
            <Text style={styles.linkedSince}>
              {t('guardian.linkedSince', { date: formatShortDate(dateKey(new Date(patient.linkedAt))) })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => turn(false)} hitSlop={10} accessibilityLabel={t('guardian.close')}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <DelayPicker value={patient.alertDelay} onChange={onDelay} />
        <TouchableOpacity style={styles.unlinkBtn} onPress={onUnlink}>
          <Ionicons name="link-outline" size={17} color={colors.danger} />
          <Text style={styles.unlinkBtnText}>{t('guardian.unlinkNamed', { name })}</Text>
        </TouchableOpacity>
      </Animated.View>
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

/** Last two weeks: one bar per day, green for taken, red for missed. */
function HistoryChart({
  slots,
  delay,
  selected,
  onSelect,
}: {
  slots: DoseSlot[];
  delay: number;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const now = new Date();
  const tally = dailyTally(slots, dateKey(now), now, delay);
  const rate = adherenceRate(tally);
  const max = Math.max(1, ...tally.map((d) => d.total));
  return (
    <View style={styles.history}>
      <View style={styles.historyHead}>
        <Text style={styles.label}>{t('guardian.history')}</Text>
        {rate !== null && (
          <Text style={[styles.historyRate, { color: rate >= 80 ? colors.success : rate >= 50 ? colors.warning : colors.danger }]}>
            {t('guardian.historyRate', { n: rate })}
          </Text>
        )}
      </View>
      <View style={styles.bars}>
        {tally.map((d) => {
          const isToday = d === tally[tally.length - 1];
          const isSelected = d.date === selected;
          return (
            <TouchableOpacity
              key={d.date}
              style={[styles.barCol, isSelected && styles.barColOn]}
              onPress={() => onSelect(d.date)}
              disabled={d.total === 0}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${formatShortDate(d.date)} ${d.taken}/${d.total}`}
            >
              <View style={styles.barTrack}>
                {d.total > 0 && (
                  <View style={{ height: `${(d.total / max) * 100}%`, width: '100%', justifyContent: 'flex-end' }}>
                    <View style={[styles.barPart, { flex: d.total - d.taken - d.missed, backgroundColor: colors.surfaceMuted }]} />
                    <View style={[styles.barPart, { flex: d.missed, backgroundColor: colors.danger }]} />
                    <View style={[styles.barPart, { flex: d.taken, backgroundColor: colors.success }]} />
                  </View>
                )}
              </View>
              <Text style={[styles.barDay, (isToday || isSelected) && styles.barToday]}>
                {Number(d.date.slice(8))}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
        <Text style={styles.legendText}>{t('guardian.state.taken')}</Text>
        <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
        <Text style={styles.legendText}>{t('guardian.state.missed')}</Text>
        <Text style={styles.legendHint}>{t('guardian.tapDay')}</Text>
      </View>
    </View>
  );
}

function TodayList({
  slots,
  delay,
  title,
  onBackToToday,
}: {
  slots: DoseSlot[];
  delay: number;
  /** Heading for a past day; today's heading when omitted. */
  title?: string;
  onBackToToday?: () => void;
}) {
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
  const head = (
    <View style={styles.listHead}>
      <Text style={styles.label}>{title ?? t('guardian.today')}</Text>
      {onBackToToday && (
        <TouchableOpacity onPress={onBackToToday} hitSlop={8}>
          <Text style={styles.backToday}>{t('guardian.backToday')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  if (!slots.length) {
    return (
      <View>
        {title && head}
        <Text style={styles.muted}>{title ? t('guardian.noDosesDay') : t('guardian.noDosesToday')}</Text>
      </View>
    );
  }
  return (
    <View>
      {head}
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
    flipWrap: { marginBottom: 16 },
    history: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line },
    historyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    historyRate: { fontSize: 13, fontWeight: '800' },
    bars: { flexDirection: 'row', gap: 3, height: 72, alignItems: 'flex-end', marginTop: 4 },
    barCol: { flex: 1, alignItems: 'center', height: '100%', borderRadius: 4, paddingHorizontal: 1 },
    barColOn: { backgroundColor: c.brandSoft },
    legendHint: { fontSize: 11, color: c.textFaint, marginLeft: 'auto' },
    listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    backToday: { fontSize: 12, fontWeight: '700', color: c.brand },
    barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', borderRadius: 3, overflow: 'hidden' },
    barPart: { width: '100%' },
    barDay: { fontSize: 9, color: c.textFaint, marginTop: 3 },
    barToday: { color: c.brand, fontWeight: '800' },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
    legendText: { fontSize: 11, color: c.textMuted },
    face: { position: 'absolute', top: 0, left: 0, right: 0, marginBottom: 0, backfaceVisibility: 'hidden' },
    linkedSince: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    unlinkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.dangerSoft,
    },
    unlinkBtnText: { fontSize: 14, fontWeight: '700', color: c.danger },
    swipeBacking: { backgroundColor: c.surface },
    unlinkAction: {
      width: 96,
      marginLeft: 8,
      borderRadius: 12,
      backgroundColor: c.danger,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    unlinkActionText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
    swipeHint: { fontSize: 11, color: c.textFaint, textAlign: 'right' },
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
